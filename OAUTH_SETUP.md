# OAuth Integration Setup

## Environment Variables

Add these to your environment configuration:

```env
# GitHub OAuth
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# LinkedIn OAuth
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here

# Twitter OAuth
VITE_TWITTER_CLIENT_ID=your_twitter_client_id_here
VITE_TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Stripe Identity Verification
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Setup Instructions

1. Register applications with each OAuth provider
2. Configure callback URLs
3. Add environment variables to your deployment platform
4. Test OAuth flows in development environment

## Security Notes

- Never commit actual API keys to version control
- Use environment variables for all sensitive configuration
- Rotate keys regularly for production applications
- Monitor for key exposure in logs and error messages