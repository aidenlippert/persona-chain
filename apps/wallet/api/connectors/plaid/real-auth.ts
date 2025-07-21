import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * REAL Plaid Link Token Creation
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
      const clientId = process.env.VITE_PLAID_CLIENT_ID;
      const secret = process.env.VITE_PLAID_SECRET;
      const environment = process.env.VITE_PLAID_ENVIRONMENT || "sandbox";

      if (!clientId || !secret) {
        console.error("Plaid credentials not configured");
        return res.status(500).json({ error: "Plaid integration not configured" });
      }

      // Generate unique session ID
      const sessionId = `plaid_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      // Determine Plaid environment URL
      const plaidUrls = {
        sandbox: "https://sandbox.plaid.com",
        development: "https://development.plaid.com",
        production: "https://production.plaid.com"
      };

      const baseUrl = plaidUrls[environment as keyof typeof plaidUrls] || plaidUrls.sandbox;

      // Create Plaid Link Token
      const linkTokenResponse = await fetch(`${baseUrl}/link/token/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          client_name: "PersonaPass Identity Wallet",
          country_codes: ["US"],
          language: "en",
          user: {
            client_user_id: userId
          },
          products: ["auth", "identity", "transactions"],
          required_if_supported_products: ["identity"],
          optional_products: ["assets", "investments"],
          redirect_uri: callbackUrl,
          webhook: `${process.env.VITE_API_BASE_URL}/webhooks/plaid`,
          account_filters: {
            depository: {
              account_type: ["checking", "savings"],
              account_subtype: ["checking", "savings", "money_market"]
            }
          },
          link_customization_name: "default",
          client_request_id: sessionId
        }),
      });

      const linkTokenData = await linkTokenResponse.json();

      if (!linkTokenData.link_token) {
        console.error("Plaid link token creation failed:", linkTokenData);
        return res.status(400).json({ 
          error: "Failed to create Plaid link token",
          details: linkTokenData.error_message || "Unknown error"
        });
      }

      return res.status(200).json({
        success: true,
        linkToken: linkTokenData.link_token,
        sessionId,
        platform: "plaid",
        environment,
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes (Plaid default)
        supportedProducts: ["auth", "identity", "transactions", "assets", "investments"],
        metadata: {
          createdAt: new Date().toISOString(),
          requestId: linkTokenData.request_id,
          expiration: linkTokenData.expiration
        }
      });

    } catch (error) {
      console.error("Plaid auth error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}