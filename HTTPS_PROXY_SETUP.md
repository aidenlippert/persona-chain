# 🚀 PersonaChain HTTPS Proxy Setup Guide

Your PersonaChain blockchain is running on HTTP, but your wallet needs HTTPS. Here are **3 easy options** to fix this:

## 🎯 **Option 1: Cloudflare Workers (Easiest - 5 minutes)**

### Step 1: Create Free Cloudflare Account
1. Go to **https://workers.cloudflare.com**
2. Click **"Sign up"** (free account)
3. Verify your email

### Step 2: Create Worker
1. Click **"Create a Worker"**
2. Delete all the default code
3. Copy and paste this code: **[/home/rocz/persona-chain/cloudflare-worker.js](file:///home/rocz/persona-chain/cloudflare-worker.js)**
4. Click **"Save and Deploy"**
5. You'll get a URL like: `https://personachain-proxy.YOUR-ACCOUNT.workers.dev`

### Step 3: Test Your Proxy
Visit: `https://personachain-proxy.YOUR-ACCOUNT.workers.dev`
- Should show a dashboard with test links
- Test the RPC and API endpoints

### Step 4: Update Wallet Configuration
```bash
VITE_PERSONA_CHAIN_RPC=https://personachain-proxy.YOUR-ACCOUNT.workers.dev/rpc
VITE_BLOCKCHAIN_REST=https://personachain-proxy.YOUR-ACCOUNT.workers.dev/api
```

---

## 🎯 **Option 2: Deno Deploy (Also Easy - 5 minutes)**

### Step 1: Create Deno Deploy Account
1. Go to **https://dash.deno.com**
2. Sign in with GitHub (free)

### Step 2: Create New Project
1. Click **"New Project"**
2. Choose **"Play"** (playground mode)
3. Copy and paste this code: **[/home/rocz/persona-chain/deno-worker.ts](file:///home/rocz/persona-chain/deno-worker.ts)**
4. Click **"Save & Deploy"**
5. You'll get a URL like: `https://your-project.deno.dev`

### Step 3: Update Wallet Configuration
```bash
VITE_PERSONA_CHAIN_RPC=https://your-project.deno.dev/rpc
VITE_BLOCKCHAIN_REST=https://your-project.deno.dev/api
```

---

## 🎯 **Option 3: Local Development (Immediate)**

### Run Wallet Locally on HTTP
```bash
cd /home/rocz/persona-chain/apps/wallet
npm run dev
```
- This serves the wallet on `http://localhost:5173`
- No Mixed Content error because both wallet and blockchain are HTTP
- Perfect for development and testing

---

## 🧪 **How to Test Your Setup**

### 1. Test Your HTTPS Proxy
Visit your proxy URL directly and click the test links.

### 2. Update Wallet Environment
Edit `/home/rocz/persona-chain/apps/wallet/vercel.json`:
```json
{
  "env": {
    "VITE_PERSONA_CHAIN_RPC": "https://YOUR-PROXY-URL/rpc",
    "VITE_BLOCKCHAIN_REST": "https://YOUR-PROXY-URL/api",
    "VITE_PERSONA_CHAIN_ID": "persona-mainnet-1",
    "VITE_DEMO_MODE": "false"
  }
}
```

### 3. Redeploy Wallet
```bash
cd /home/rocz/persona-chain/apps/wallet
npx vercel --prod
```

### 4. Test Final Connection
Go to your wallet URL and check if Keplr can connect without Mixed Content errors.

---

## 🎉 **What This Fixes**

✅ **Mixed Content Error**: HTTPS wallet can now connect to blockchain  
✅ **Keplr Integration**: Wallet extension will work properly  
✅ **Production Ready**: Secure HTTPS endpoints with SSL certificates  
✅ **Global CDN**: Fast worldwide access to your blockchain  

---

## 🤝 **Need Help?**

**I can help you with:**
- Setting up the Cloudflare Worker (if you share your API token)
- Updating the wallet configuration
- Testing the final setup

**Which option sounds easiest to you?**
1. Cloudflare Workers (most popular)
2. Deno Deploy (GitHub login)
3. Local development (immediate testing)

Just let me know and I'll guide you through it step by step!