# Cloudflare SSL Setup for PersonaChain

## Quick Setup Instructions

### Step 1: Create Free Cloudflare Account
1. Go to https://cloudflare.com
2. Sign up for free account
3. Skip domain setup for now

### Step 2: Use Cloudflare Tunnel (Zero Trust)
1. Go to **Zero Trust** → **Networks** → **Tunnels**
2. Create a new tunnel called "personachain"
3. Install cloudflared connector
4. Add public hostnames:
   - `rpc.yourdomain.com` → `http://34.170.121.182:26657`
   - `api.yourdomain.com` → `http://34.170.121.182:1317`

### Alternative: Use Cloudflare Workers
We can create a Cloudflare Worker that proxies requests to PersonaChain with automatic SSL.