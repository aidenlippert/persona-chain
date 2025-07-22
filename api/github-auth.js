export default async function handler(req, res) {
  console.log('🚀 ROOT LEVEL GITHUB AUTH FUNCTION CALLED');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    return;
  }

  const { code, state, userId } = req.body || {};
  
  console.log('Request body:', { code: code?.substring(0, 10), state, userId });
  
  // For now, create a mock credential to test if the function works
  const mockCredential = {
    id: `github_cred_${Date.now()}`,
    type: ["VerifiableCredential", "GitHubCredential"],
    issuer: "did:persona:github",
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: userId || `did:persona:user_${Date.now()}`,
      platform: 'github',
      username: 'test-user',
      userId: 12345,
      name: 'Test User',
      email: 'test@example.com',
      publicRepos: 10,
      followers: 50,
      following: 30,
      verifiedAt: new Date().toISOString()
    },
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod"
    }
  };

  res.status(200).json({
    success: true,
    credential: mockCredential,
    userData: mockCredential.credentialSubject,
    sessionId: state,
    message: "ROOT LEVEL GITHUB AUTH WORKS!"
  });
}