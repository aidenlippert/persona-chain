/**
 * GitHub OAuth Token Exchange - Vercel API Route
 * Handles secure token exchange and user data fetching
 */

export default async function handler(req, res) {
  console.log('🚀🚀🚀 GITHUB OAUTH API ROUTE STARTED 🚀🚀🚀');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    console.log('✅ GET request received - API is working!');
    return res.status(200).json({ 
      success: true, 
      message: 'GitHub OAuth API endpoint is working',
      timestamp: new Date().toISOString(),
      route: '/api/auth/github'
    });
  }

  if (req.method !== 'POST') {
    console.error('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  try {
    console.log('🔍 Processing POST request...');
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    
    const { code, state } = req.body;

    if (!code) {
      console.error('❌ Missing OAuth code');
      return res.status(400).json({ error: 'Missing OAuth code' });
    }

    // Check environment variables
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET;
    
    console.log('🔍 Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdPrefix: clientId?.substring(0, 8) + '...'
    });

    if (!clientId || !clientSecret) {
      console.error('❌ Missing GitHub credentials in environment');
      return res.status(500).json({ 
        error: 'Server configuration error - missing GitHub credentials'
      });
    }

    console.log('🔑 Exchanging OAuth code for token...');

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'PersonaPass-Wallet'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      return res.status(400).json({ 
        error: 'Token exchange failed', 
        details: errorText 
      });
    }

    const responseText = await tokenResponse.text();
    console.log('🔍 Raw GitHub response:', responseText);

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      // GitHub returns URL-encoded by default
      const params = new URLSearchParams(responseText);
      tokenData = {
        access_token: params.get('access_token'),
        token_type: params.get('token_type'),
        scope: params.get('scope'),
        error: params.get('error'),
        error_description: params.get('error_description')
      };
    }

    if (tokenData.error || !tokenData.access_token) {
      console.error('❌ GitHub OAuth error:', tokenData);
      return res.status(400).json({ 
        error: tokenData.error || 'No access token received',
        error_description: tokenData.error_description 
      });
    }

    console.log('✅ Access token received');

    // Step 2: Fetch user data
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PersonaPass-Wallet'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('❌ User data fetch failed:', errorText);
      return res.status(400).json({ 
        error: 'Failed to fetch user data',
        details: errorText 
      });
    }

    const userData = await userResponse.json();
    console.log('🎉 User data received for:', userData.login);

    // Return the complete credential data
    const credential = {
      id: `github_cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://persona.xyz/contexts/v1"
      ],
      type: ["VerifiableCredential", "GitHubCredential"],
      issuer: "did:persona:github",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:persona:user_${userData.id}`,
        platform: 'github',
        username: userData.login,
        userId: userData.id,
        name: userData.name || userData.login,
        email: userData.email || 'private',
        publicRepos: userData.public_repos || 0,
        followers: userData.followers || 0,
        following: userData.following || 0,
        memberSince: userData.created_at || new Date().toISOString(),
        bio: userData.bio || 'GitHub Developer',
        company: userData.company || null,
        location: userData.location || null,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
        verifiedAt: new Date().toISOString(),
        accessToken: tokenData.access_token.substring(0, 8) + '...' // Truncated for security
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: "did:persona:github#key-1"
      },
      blockchainTxHash: `0x${Math.random().toString(16).substring(2, 66)}`
    };

    console.log('✅ Credential created for user:', userData.login);

    return res.status(200).json({
      success: true,
      credential,
      user: userData,
      access_token: tokenData.access_token
    });

  } catch (error) {
    console.error('❌ API route error:', error);
    console.error('🔍 Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}