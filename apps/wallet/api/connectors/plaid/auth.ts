import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for personapass.xyz
  res.setHeader("Access-Control-Allow-Origin", "https://personapass.xyz");
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
      const sessionId = `plaid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validate required environment variables
      const clientId = process.env.VITE_PLAID_CLIENT_ID;
      const plaidEnv = process.env.VITE_PLAID_ENV || "sandbox";
      const isDemoMode = process.env.VITE_MOCK_INTEGRATIONS === "true";

      if (!clientId) {
        console.error("Plaid client ID not configured");
        return res.status(500).json({ error: "Plaid integration not configured" });
      }

      // For Plaid, we'll need to use their Link flow which is different from OAuth
      // This is a simplified implementation - in production you'd use Plaid Link SDK
      if (isDemoMode) {
        // For demo purposes, simulate Plaid Link flow
        return res.status(200).json({
          success: true,
          linkToken: `link-${plaidEnv}-${sessionId}`,
          sessionId,
          platform: "plaid",
          environment: plaidEnv,
          // In real Plaid integration, you'd return the actual Link token
          authUrl: `${callbackUrl}?platform=plaid&sessionId=${sessionId}&status=success`,
        });
      } else {
        // In production, integrate with actual Plaid Link SDK
        // This would involve creating a Plaid Link token using their API
        throw new Error("Production Plaid integration not yet implemented");
      }
    } catch (error) {
      console.error("Plaid auth error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
