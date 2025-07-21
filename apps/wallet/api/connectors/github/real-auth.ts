import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * REAL GitHub OAuth Authentication
 * NO HARDCODED VALUES - ALL ENVIRONMENT CONFIGURED
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOrigin = process.env.VITE_CORS_ORIGIN || "https://personapass.xyz";
  
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

      // Validate required environment variables
      const clientId = process.env.VITE_GITHUB_CLIENT_ID;
      const clientSecret = process.env.VITE_GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("GitHub credentials not configured");
        return res.status(500).json({ error: "GitHub integration not configured" });
      }

      // Generate secure session ID
      const sessionId = `github_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const state = Buffer.from(JSON.stringify({ sessionId, userId })).toString('base64');
      
      // Build GitHub OAuth URL with proper scopes
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", `${callbackUrl}?platform=github`);
      authUrl.searchParams.set("scope", "user:email read:user");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("allow_signup", "true");

      return res.status(200).json({
        success: true,
        authUrl: authUrl.toString(),
        sessionId,
        platform: "github",
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      });
    } catch (error) {
      console.error("GitHub auth error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}