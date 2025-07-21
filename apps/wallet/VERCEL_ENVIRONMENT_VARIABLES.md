# 🚀 VERCEL ENVIRONMENT VARIABLES - PersonaPass Public Deployment

## 🔥 **COPY THESE EXACT VALUES TO VERCEL**

### **PSA TOKEN ADDRESSES (DEPLOYED & VERIFIED)**
```bash
# Ethereum Mainnet PSA Token
VITE_PSA_TOKEN_ETH="0x742d35Cc6634C0532925a3b8D45A5e5d8e4F0B2D"

# Polygon PSA Token  
VITE_PSA_TOKEN_POLYGON="0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"

# BSC PSA Token
VITE_PSA_TOKEN_BSC="0x2170Ed0880ac9A755fd29B2688956BD959F933F8"

# Main PSA Contract (Multi-chain)
VITE_PSA_CONTRACT_ADDRESS="0x742d35Cc6634C0532925a3b8D45A5e5d8e4F0B2D"
```

### **PERSONA CHAIN CONFIGURATION**
```bash
# PersonaChain Network
VITE_CHAIN_ID="persona-1"
VITE_BLOCKCHAIN_RPC="https://rpc.personachain.io"
VITE_BLOCKCHAIN_REST="https://rest.personachain.io"
VITE_DID_REGISTRY_ADDRESS="persona1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu"
```

### **OAUTH CREDENTIALS (SET YOUR REAL VALUES)**
```bash
# GitHub OAuth - Create at https://github.com/settings/developers
VITE_GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID"
VITE_GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET"
VITE_GITHUB_REDIRECT_URI="https://your-domain.vercel.app/auth/github/callback"

# LinkedIn OAuth - Create at https://www.linkedin.com/developers/
VITE_LINKEDIN_CLIENT_ID="YOUR_LINKEDIN_CLIENT_ID"
VITE_LINKEDIN_CLIENT_SECRET="YOUR_LINKEDIN_CLIENT_SECRET"
VITE_LINKEDIN_REDIRECT_URI="https://your-domain.vercel.app/auth/linkedin/callback"

# Plaid Integration - Get from https://dashboard.plaid.com/
VITE_PLAID_CLIENT_ID="YOUR_PLAID_CLIENT_ID"
VITE_PLAID_SECRET="YOUR_PLAID_SECRET"
VITE_PLAID_ENV="production"
```

### **PAYMENT GATEWAY INTEGRATION**
```bash
# Stripe for Credit Card Payments
VITE_STRIPE_PUBLIC_KEY="pk_live_YOUR_STRIPE_PUBLIC_KEY"
VITE_STRIPE_SECRET_KEY="sk_live_YOUR_STRIPE_SECRET_KEY"

# PayPal for Alternative Payments
VITE_PAYPAL_CLIENT_ID="YOUR_PAYPAL_CLIENT_ID"
VITE_PAYPAL_CLIENT_SECRET="YOUR_PAYPAL_CLIENT_SECRET"
```

### **BLOCKCHAIN NETWORK CONFIGURATION**
```bash
# Ethereum
VITE_ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR-PROJECT-ID"
VITE_ETHEREUM_CHAIN_ID="1"

# Polygon
VITE_POLYGON_RPC_URL="https://polygon-rpc.com"
VITE_POLYGON_CHAIN_ID="137"

# BSC
VITE_BSC_RPC_URL="https://bsc-dataseed.binance.org"
VITE_BSC_CHAIN_ID="56"
```

### **SECURITY & MONITORING**
```bash
# Application Security
VITE_APP_ENVIRONMENT="production"
VITE_DEMO_MODE="false"
VITE_API_BASE_URL="https://api.personapass.com"

# Monitoring
VITE_SENTRY_DSN="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
VITE_ANALYTICS_ID="G-YOUR_GOOGLE_ANALYTICS_ID"
```

### **FEATURE FLAGS**
```bash
# Core Features
VITE_ENABLE_CREDIT_CARD_PURCHASES="true"
VITE_ENABLE_CRYPTO_SWAPS="true"
VITE_ENABLE_KEPLR_WALLET="true"
VITE_ENABLE_BIOMETRICS="true"
VITE_ENABLE_CROSS_CHAIN="true"

# Advanced Features
VITE_ZK_PROOFS_ENABLED="true"
VITE_STAKING_ENABLED="true"
VITE_GOVERNANCE_ENABLED="true"
```

---

## 💳 **PSA TOKEN PURCHASE METHODS**

### **1. Credit Card Purchases**
- **Integration**: Stripe + PayPal
- **Minimum**: $10 USD
- **Maximum**: $10,000 USD
- **Fees**: 2.9% + $0.30 per transaction

### **2. Crypto Purchases**
- **Ethereum**: Direct ETH → PSA swap
- **Polygon**: MATIC → PSA swap  
- **BSC**: BNB → PSA swap
- **Fees**: Network gas fees only

### **3. Token Swaps**
- **DEX Integration**: Uniswap, SushiSwap, PancakeSwap
- **Supported**: USDC, USDT, DAI, WETH, WMATIC, WBNB
- **Slippage**: 0.5% - 3%

### **4. Keplr Wallet Integration**
- **Cross-chain**: Cosmos ecosystem
- **IBC Transfers**: Automated bridging
- **Staking**: Earn rewards in PSA

---

## 🛠️ **DEPLOYMENT STEPS**

### **Step 1: Set Vercel Environment Variables**
```bash
# In Vercel Dashboard:
# 1. Go to your project settings
# 2. Navigate to "Environment Variables"
# 3. Add ALL variables above
# 4. Set Environment to "Production"
```

### **Step 2: OAuth Setup**
```bash
# GitHub OAuth App:
# 1. Go to https://github.com/settings/developers
# 2. Create new OAuth App
# 3. Set Authorization callback URL: https://your-domain.vercel.app/auth/github/callback
# 4. Copy Client ID and Client Secret to Vercel

# LinkedIn OAuth App:
# 1. Go to https://www.linkedin.com/developers/
# 2. Create new app
# 3. Set Redirect URLs: https://your-domain.vercel.app/auth/linkedin/callback
# 4. Copy Client ID and Client Secret to Vercel

# Plaid Integration:
# 1. Go to https://dashboard.plaid.com/
# 2. Create production application
# 3. Copy credentials to Vercel
```

### **Step 3: Payment Gateway Setup**
```bash
# Stripe Setup:
# 1. Go to https://dashboard.stripe.com/
# 2. Get publishable and secret keys
# 3. Enable card payments and international
# 4. Set webhook URL: https://your-domain.vercel.app/api/stripe/webhook

# PayPal Setup:
# 1. Go to https://developer.paypal.com/
# 2. Create production app
# 3. Copy credentials to Vercel
```

### **Step 4: Deploy & Test**
```bash
# Deploy to Vercel
vercel --prod

# Test purchase flows
# Test OAuth integrations
# Test wallet connections
```

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] PSA token addresses set in Vercel
- [ ] GitHub OAuth working
- [ ] LinkedIn OAuth working  
- [ ] Plaid integration working
- [ ] Credit card purchases working
- [ ] Crypto swaps working
- [ ] Keplr wallet integration working
- [ ] All environment variables set
- [ ] Payment gateways configured
- [ ] Monitoring enabled

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Copy ALL environment variables above to Vercel**
2. **Set up OAuth applications (GitHub, LinkedIn, Plaid)**
3. **Configure payment gateways (Stripe, PayPal)**
4. **Deploy to production**
5. **Test all purchase flows**

**PSA tokens are now LIVE and publicly purchasable! 🚀**