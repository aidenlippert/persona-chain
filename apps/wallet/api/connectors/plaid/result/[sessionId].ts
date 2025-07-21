import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      // Mock Plaid financial credential data
      const mockCredential = {
        credential: {
          id: `plaid-cred-${sessionId}`,
          type: ["VerifiableCredential", "FinancialProfile"],
          issuer: "did:persona:plaid-issuer",
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: `did:persona:user-${Date.now()}`,
            platform: "plaid",
            bankName: "Demo Bank",
            accountType: "checking",
            accountVerified: true,
            creditScore: 750,
            incomeVerified: true,
            monthlyIncome: 8500,
            employmentStatus: "employed",
            accountAge: 36, // months
          },
        },
        zkCommitment: {
          commitment: `0x${Math.random().toString(16).substr(2, 64)}`,
          salt: `0x${Math.random().toString(16).substr(2, 32)}`,
          fields: ["accountVerified", "creditScore", "incomeVerified"],
        },
        platform: "plaid",
      };

      return res.status(200).json(mockCredential);
    } catch (error) {
      console.error("Plaid result error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
