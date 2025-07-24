import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

// BigInt serialization fix
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate secure state parameter
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    
    // Create signed JWT with state and expiration
    const sessionData = {
      state,
      nonce,
      timestamp: Date.now(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes
    };
    
    const sessionToken = jwt.sign(sessionData, process.env.JWT_SECRET || 'fallback-secret');
    
    // Set secure HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `oauth_state=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_nonce=${nonce}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`
    ]);
    
    // Build GitHub OAuth URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.NODE_ENV === 'production' 
        ? 'https://wallet-4agf1oany-aiden-lipperts-projects.vercel.app'
        : 'http://localhost:5173');
        
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID || '');
    githubUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/github/callback`);
    githubUrl.searchParams.set('scope', 'user:email read:user');
    githubUrl.searchParams.set('state', state);
    githubUrl.searchParams.set('response_type', 'code');
    
    console.log('GitHub OAuth Init:', {
      clientId: process.env.GITHUB_CLIENT_ID ? 'Set' : 'Missing',
      redirectUri: `${baseUrl}/api/auth/github/callback`,
      state: state.substring(0, 8) + '...'
    });
    
    // Return redirect URL for frontend to use
    res.status(200).json({
      success: true,
      redirectUrl: githubUrl.toString(),
      state,
      message: 'GitHub OAuth initialization successful'
    });
    
  } catch (error) {
    console.error('GitHub OAuth Init Error:', error);
    res.status(500).json({
      error: 'Failed to initialize GitHub OAuth',
      code: 'OAUTH_INIT_ERROR'
    });
  }
}