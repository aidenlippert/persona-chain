# Stripe Identity Verification - Quick Start

## Overview

Integration guide for Stripe Identity verification in PersonaPass.

## Prerequisites

- Stripe account with Identity verification enabled
- PersonaPass development environment set up
- Node.js 18+ and npm installed

## Step 1: Stripe Account Setup

1. Enable Stripe Identity in your dashboard
2. Configure webhook endpoints
3. Get your API keys from the Stripe dashboard

## Step 2: Environment Configuration

Add these to your Vercel environment variables:

```env
# Stripe Identity API Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Step 3: Install Dependencies

```bash
npm install @stripe/stripe-js stripe
```

## Step 4: Frontend Integration

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);
```

## Step 5: Backend Webhook Setup

```typescript
// Handle Stripe Identity webhook events
app.post('/api/stripe/webhook', (req, res) => {
  // Process webhook events
});
```

## Testing

1. Use Stripe test mode for development
2. Test with sample identity documents
3. Verify webhook delivery in Stripe dashboard

## Security Best Practices

- Never expose secret keys in frontend code
- Validate webhook signatures
- Use HTTPS for all webhook endpoints
- Store sensitive data securely