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

      // In a real implementation, you would:
      // 1. Exchange the OAuth code for an access token
      // 2. Fetch user data from GitHub API
      // 3. Create a verifiable credential
      // 4. Generate ZK commitment

      // For demo purposes, return mock credential data
      const mockCredential = {
        credential: {
          id: `github-cred-${sessionId}`,
          type: ["VerifiableCredential", "GitHubProfile"],
          issuer: "did:persona:github-issuer",
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: `did:persona:user-${Date.now()}`,
            platform: "github",
            username: "demo-user",
            profileUrl: "https://github.com/demo-user",
            verified: true,
            followers: 142,
            following: 89,
            publicRepos: 23,
            createdAt: "2020-01-15T10:30:00Z",
          },
        },
        zkCommitment: {
          commitment: `0x${Math.random().toString(16).substr(2, 64)}`,
          salt: `0x${Math.random().toString(16).substr(2, 32)}`,
          fields: ["username", "verified", "followers"],
        },
        platform: "github",
      };

      return res.status(200).json(mockCredential);
    } catch (error) {
      console.error("GitHub result error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
