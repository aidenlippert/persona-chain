# 🚨 URGENT: Fix "persona-chain" Error on Vercel

## The Problem
Your Vercel deployment is using OLD code that doesn't recognize "persona-chain" as a valid network.

## Quick Fix Options:

### Option 1: Remove the Environment Variable (FASTEST)
In Vercel, REMOVE this environment variable:
- `VITE_BLOCKCHAIN_NETWORK` 

The app will use the default "persona-chain" from the code.

### Option 2: Use a Supported Network Name (TEMPORARY)
Change in Vercel:
- `VITE_BLOCKCHAIN_NETWORK=ethereum` (instead of persona-chain)

This tricks the validation but still uses PersonaChain endpoints.

### Option 3: Deploy Updated Code (BEST)
The code is already fixed locally. You need to:
1. Push to your GitHub repository
2. Vercel will auto-deploy with persona-chain support

## Updated Code Changes Made:
- ✅ `apps/wallet/src/config/index.ts` - Added 'persona-chain' to enum
- ✅ `apps/wallet/src/services/keplrService.ts` - Updated to use public IP

## Immediate Action:
**Go to Vercel → Settings → Environment Variables**
**DELETE the `VITE_BLOCKCHAIN_NETWORK` variable**

Then your app will work!