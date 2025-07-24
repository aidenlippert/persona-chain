import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { githubVCService } from '../../../src/services/githubVCService';

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
    const { code, state, error: oauthError } = req.query;
    const sessionCookie = req.cookies.oauth_state;

    console.log('GitHub OAuth Callback:', {
      hasCode: !!code,
      hasState: !!state,
      hasSessionCookie: !!sessionCookie,
      oauthError
    });

    // Handle OAuth errors
    if (oauthError) {
      console.error('GitHub OAuth Error:', oauthError);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=oauth_denied`);
    }

    // Validate required parameters
    if (!code || !state || !sessionCookie) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state, sessionCookie: !!sessionCookie });
      return res.redirect(`${getFrontendUrl()}/dashboard?error=invalid_request`);
    }

    // Validate state parameter
    try {
      const sessionData = jwt.verify(sessionCookie, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      if (state !== sessionData.state) {
        console.error('State parameter mismatch');
        return res.redirect(`${getFrontendUrl()}/dashboard?error=invalid_state`);
      }

      // Check token expiration (10 minutes)
      if (Date.now() / 1000 > sessionData.exp) {
        console.error('Session token expired');
        return res.redirect(`${getFrontendUrl()}/dashboard?error=session_expired`);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=invalid_session`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PersonaPass-Wallet/1.0'
      },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID || '',
        client_secret: process.env.GITHUB_CLIENT_SECRET || '',
        code: code as string,
        state: state as string
      })
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('GitHub token error:', tokens);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=${tokens.error}`);
    }

    console.log('GitHub token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      tokenType: tokens.token_type,
      scope: tokens.scope
    });

    // Get user data from GitHub API
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PersonaPass-Wallet/1.0'
      }
    });

    if (!userResponse.ok) {
      console.error('GitHub user API failed:', userResponse.status, userResponse.statusText);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=user_fetch_failed`);
    }

    const userData = await userResponse.json();
    
    // Get user email (primary email)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PersonaPass-Wallet/1.0'
      }
    });

    let emails = [];
    if (emailResponse.ok) {
      emails = await emailResponse.json();
    }

    const primaryEmail = emails.find((email: any) => email.primary) || { email: userData.email };

    console.log('GitHub user data retrieved:', {
      login: userData.login,
      id: userData.id,
      hasEmail: !!primaryEmail?.email,
      publicRepos: userData.public_repos,
      followers: userData.followers
    });

    // Create basic GitHub credential data for now
    try {
      const credentialData = {
        id: `github-${userData.id}-${Date.now()}`,
        type: ['VerifiableCredential', 'GitHubProfile'],
        issuer: 'did:persona:github',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: `github:${userData.login}`,
          login: userData.login,
          name: userData.name,
          email: primaryEmail?.email,
          bio: userData.bio,
          location: userData.location,
          company: userData.company,
          publicRepos: userData.public_repos,
          followers: userData.followers,
          following: userData.following,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        },
        metadata: {
          provider: 'github',
          tokenScope: tokens.scope,
          verifiedAt: new Date().toISOString()
        }
      };
      
      console.log('GitHub credential data prepared:', {
        credentialId: credentialData.id,
        login: userData.login,
        hasEmail: !!primaryEmail?.email
      });

      // Clear OAuth cookies
      res.setHeader('Set-Cookie', [
        'oauth_state=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        'oauth_nonce=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      ]);

      // For now, redirect with credential data in URL params (will be stored properly later)
      const frontendUrl = getFrontendUrl();
      const encodedCredential = encodeURIComponent(JSON.stringify(credentialData));
      const redirectUrl = `${frontendUrl}/dashboard?credential_created=github&credential_data=${encodedCredential}&provider=github`;
      
      console.log('Redirecting to frontend with GitHub credential data');
      return res.redirect(redirectUrl);

    } catch (vcError) {
      console.error('GitHub credential preparation error:', vcError);
      return res.redirect(`${getFrontendUrl()}/dashboard?error=credential_creation_failed`);
    }

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return res.redirect(`${getFrontendUrl()}/dashboard?error=internal_error`);
  }
}

function getFrontendUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://wallet-4agf1oany-aiden-lipperts-projects.vercel.app';
  }
  
  return 'http://localhost:5173';
}