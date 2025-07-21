import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for personapass.xyz
  res.setHeader("Access-Control-Allow-Origin", "https://wallet-rmyzq2dj0-aiden-lipperts-projects.vercel.app");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { userId, callbackUrl } = req.body;

      if (!userId || !callbackUrl) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Generate a session ID
      const sessionId = `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validate required environment variables
      const clientId = process.env.VITE_LINKEDIN_CLIENT_ID;
      const oauthScope = process.env.VITE_LINKEDIN_OAUTH_SCOPE || "r_liteprofile r_emailaddress";
      const linkedinAuthUrl = process.env.VITE_LINKEDIN_AUTH_URL || "https://www.linkedin.com/oauth/v2/authorization";

      if (!clientId) {
        console.error("LinkedIn client ID not configured");
        return res.status(500).json({ error: "LinkedIn integration not configured" });
      }

      const redirectUri = `https://wallet-rmyzq2dj0-aiden-lipperts-projects.vercel.app/credentials/callback`;

      // Build LinkedIn OAuth URL
      const authUrl = new URL(linkedinAuthUrl);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", oauthScope);
      authUrl.searchParams.set("state", sessionId);

      return res.status(200).json({
        success: true,
        authUrl: authUrl.toString(),
        sessionId,
        platform: "linkedin",
      });
    } catch (error) {
      console.error("LinkedIn auth error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
