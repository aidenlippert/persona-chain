# GitHub OAuth Setup for Vercel Production

## Overview

This document outlines the proper configuration for GitHub OAuth in PersonaPass Identity Wallet deployed on Vercel.

## Prerequisites

1. GitHub OAuth App created at https://github.com/settings/developers
2. Vercel project deployed
3. Production domain configured

## Environment Variables

### Vercel Dashboard Configuration

Set these environment variables in your Vercel project settings:

```bash
# GitHub OAuth credentials (DO NOT prefix with VITE_)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### GitHub OAuth App Settings

Configure your GitHub OAuth App with:

- **Authorization callback URL**: `https://personapass.xyz/oauth/github/callback`
- **Homepage URL**: `https://personapass.xyz`

## Common Issues & Solutions

### 1. Out of Memory Errors

**Problem**: Vercel serverless functions default to 1024MB memory, which can be insufficient for complex OAuth flows.

**Solution**: Configure memory in `vercel.json`:

```json
{
  "functions": {
    "api/connectors/github/auth.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  }
}
```

### 2. CORS Errors

**Problem**: Cross-origin requests blocked by browser.

**Solution**: Ensure proper CORS headers in serverless function:

```typescript
res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

### 3. Environment Variable Access

**Problem**: `VITE_` prefixed variables are not accessible in serverless functions.

**Solution**: Use non-prefixed environment variables or fallback:

```typescript
const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET;
```

### 4. Request Timeouts

**Problem**: GitHub API calls can be slow, causing function timeouts.

**Solution**: Implement timeout wrappers:

```typescript
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Use with 5 second timeout
const response = await withTimeout(fetch(...), 5000);
```

### 5. CSP Policy Restrictions

**Problem**: Content Security Policy blocking API calls.

**Solution**: Ensure GitHub domains are in CSP connect-src:

```json
"connect-src 'self' https://api.github.com https://github.com"
```

## Performance Optimization

1. **Minimize Dependencies**: Keep serverless function lean
2. **Use Streaming**: For large responses, use streaming instead of buffering
3. **Cache Results**: Implement caching for user data where appropriate
4. **Error Handling**: Fail fast with proper error messages

## Security Best Practices

1. **State Validation**: Always validate OAuth state parameter
2. **HTTPS Only**: Ensure all callbacks use HTTPS
3. **Token Storage**: Never log or expose access tokens
4. **Rate Limiting**: Implement rate limiting for OAuth endpoints
5. **Input Validation**: Validate all inputs before processing

## Testing

### Local Testing

```bash
# Set environment variables
export GITHUB_CLIENT_ID=your_client_id
export GITHUB_CLIENT_SECRET=your_client_secret

# Run locally
vercel dev
```

### Production Testing

1. Deploy to Vercel
2. Check function logs in Vercel dashboard
3. Monitor memory usage and execution time
4. Test OAuth flow end-to-end

## Monitoring

Monitor these metrics in Vercel dashboard:

- Function execution time
- Memory usage
- Error rate
- Cold start frequency

## Troubleshooting Checklist

- [ ] Environment variables set correctly in Vercel
- [ ] GitHub OAuth callback URL matches exactly
- [ ] Function memory configured appropriately
- [ ] CORS headers properly set
- [ ] CSP policy includes GitHub domains
- [ ] Timeout handling implemented
- [ ] Error logging enabled