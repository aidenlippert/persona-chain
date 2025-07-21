# 🚀 VERCEL DEPLOYMENT FIX - IMMEDIATE ACTION REQUIRED

## Problem
Your Vercel deployment is failing with:
```
ZodError: Invalid enum value. Expected 'ethereum' | 'polygon' | 'bsc', received 'persona-chain'
```

## Solution
The fix is ready! Apply these changes immediately:

### Option 1: Direct File Edit (FASTEST)

1. **Edit `apps/wallet/src/config/index.ts`**:
   ```typescript
   // Line 17: Change this line:
   VITE_BLOCKCHAIN_NETWORK: z.enum(['ethereum', 'polygon', 'bsc']).default('polygon'),
   
   // To this:
   VITE_BLOCKCHAIN_NETWORK: z.enum(['ethereum', 'polygon', 'bsc', 'persona-chain']).default('persona-chain'),
   ```

2. **Edit `apps/wallet/src/services/keplrService.ts`**:
   ```typescript
   // Line 195: Change:
   chainId: import.meta.env.VITE_CHAIN_ID || "persona-1",
   // To:
   chainId: import.meta.env.VITE_CHAIN_ID || "persona-chain-1",
   
   // Line 198-201: Change:
   rpc: import.meta.env.VITE_BLOCKCHAIN_RPC || "https://rpc.personachain.com",
   rest: import.meta.env.VITE_BLOCKCHAIN_REST || "https://rest.personachain.com",
   // To:
   rpc: import.meta.env.VITE_BLOCKCHAIN_RPC || "http://192.184.204.181:26657",
   rest: import.meta.env.VITE_BLOCKCHAIN_REST || "http://192.184.204.181:1317",
   ```

### Option 2: Apply Patch File (ALTERNATIVE)

```bash
# Download the patch file from this directory
curl -O /tmp/persona-chain-vercel-fix.patch
git apply persona-chain-vercel-fix.patch
```

## Deploy to Vercel

1. **Commit and Push:**
   ```bash
   git add apps/wallet/src/config/index.ts apps/wallet/src/services/keplrService.ts
   git commit -m "fix: Add persona-chain support for Vercel deployment"
   git push origin main
   ```

2. **Set Vercel Environment Variables:**
   ```
   VITE_BLOCKCHAIN_RPC=https://person.aidenlippert.workers.dev/rpc
   VITE_BLOCKCHAIN_REST=https://person.aidenlippert.workers.dev/api
   VITE_CHAIN_ID=persona-chain-1
   ```

3. **DO NOT SET** `VITE_BLOCKCHAIN_NETWORK` - let it use the default from code!

4. **If still failing:**
   - Go to Vercel Dashboard → Settings → Advanced
   - Click "Clear Build Cache"
   - Trigger new deployment

## Verification

After deployment, your PersonaPass should:
- ✅ Load without ZodError
- ✅ Connect to PersonaChain blockchain via HTTPS proxy
- ✅ Display blockchain status as "Connected"
- ✅ Allow Keplr wallet connection

## HTTPS Endpoints (Already Working)

Your Cloudflare Worker is live at:
- **RPC:** https://person.aidenlippert.workers.dev/rpc/
- **API:** https://person.aidenlippert.workers.dev/api/

This automatically proxies to your PersonaChain blockchain at `192.184.204.181`.

---

**CRITICAL:** Apply this fix NOW to get your Vercel deployment working! 🚀