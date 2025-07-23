# PersonaPass REAL API Integrations Setup

## 🔗 REAL API INTEGRATIONS FOR VC CREATION

The current API connectors are using mock data. Here's how to set up REAL integrations:

## 🔧 REQUIRED API CREDENTIALS

### **GitHub API**
```
VITE_GITHUB_CLIENT_ID
your_github_client_id

VITE_GITHUB_CLIENT_SECRET
your_github_client_secret
```

### **LinkedIn API**
```
VITE_LINKEDIN_CLIENT_ID
your_linkedin_client_id

VITE_LINKEDIN_CLIENT_SECRET
your_linkedin_client_secret
```

### **Plaid API**
```
VITE_PLAID_CLIENT_ID
your_plaid_client_id

VITE_PLAID_SECRET
your_plaid_secret

VITE_PLAID_ENVIRONMENT
sandbox
```

## 📋 HOW TO GET API CREDENTIALS

### **GitHub OAuth App**
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: PersonaPass
   - **Homepage URL**: https://personapass.xyz
   - **Authorization callback URL**: https://personapass.xyz/api/connectors/github/callback
4. Copy **Client ID** and **Client Secret**

### **LinkedIn OAuth App**
1. Go to: https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in:
   - **App name**: PersonaPass
   - **LinkedIn Page**: Your company page
   - **Privacy policy URL**: https://personapass.xyz/privacy
   - **App logo**: Upload PersonaPass logo
4. In Products → Request "Sign In with LinkedIn"
5. Copy **Client ID** and **Client Secret**

### **Plaid API**
1. Go to: https://dashboard.plaid.com/signup
2. Create account and verify
3. Go to Team Settings → Keys
4. Copy **Client ID** and **Secret** (Sandbox)
5. For production, switch to Development/Production environment

## 🔄 REAL API IMPLEMENTATIONS

### **GitHub Integration Flow**
1. **OAuth Flow**: User clicks "Connect GitHub"
2. **Authorization**: Redirect to GitHub OAuth
3. **Code Exchange**: Exchange code for access token
4. **Data Fetch**: Get user profile, repos, contributions
5. **VC Creation**: Create verifiable credential with real data
6. **ZK Commitment**: Generate zero-knowledge proof

### **LinkedIn Integration Flow**
1. **OAuth Flow**: User clicks "Connect LinkedIn"  
2. **Authorization**: Redirect to LinkedIn OAuth
3. **Code Exchange**: Exchange code for access token
4. **Data Fetch**: Get profile, experience, skills, connections
5. **VC Creation**: Create professional credential
6. **ZK Commitment**: Generate proof for selective disclosure

### **Plaid Integration Flow**
1. **Link Token**: Generate Plaid Link token
2. **Bank Connection**: User connects bank account
3. **Public Token**: Exchange public token for access token
4. **Data Fetch**: Get account balance, transactions, income
5. **VC Creation**: Create financial credential
6. **ZK Commitment**: Generate proof for income verification

## 🎯 WHAT DATA GETS COLLECTED

### **GitHub VC Contains:**
- Username, display name, email
- Profile URL, avatar
- Follower/following count
- Public repository count
- Account creation date
- Contribution activity
- Organization memberships
- Repository languages

### **LinkedIn VC Contains:**
- Full name, headline, location
- Profile URL, photo
- Current position, company
- Work experience history
- Education history
- Skills and endorsements
- Connection count
- Industry

### **Plaid VC Contains:**
- Account holder name
- Account balance (encrypted)
- Account type (checking/savings)
- Transaction history (aggregated)
- Income verification
- Account age
- Bank name, routing number (masked)

## 🔒 PRIVACY & SECURITY

### **Data Minimization**
- Only collect necessary data for VC
- Use ZK proofs for selective disclosure
- Encrypt sensitive financial data
- Hash personal identifiers

### **User Control**
- Users choose what data to include
- Granular privacy controls
- Can revoke access anytime
- Delete stored data on request

### **Zero-Knowledge Proofs**
- Prove age without revealing birthdate
- Prove income threshold without exact amount
- Prove employment without revealing salary
- Prove education without revealing grades

## 🚀 IMPLEMENTATION STEPS

1. **Get API Credentials** (above)
2. **Add to Vercel Environment Variables**
3. **Update API Endpoints** (I'll create these)
4. **Test OAuth Flows**
5. **Deploy and Verify**

## 📝 NEXT STEPS

Would you like me to:
1. **Create the real API implementations** for GitHub/LinkedIn/Plaid?
2. **Set up the OAuth flows** with proper error handling?
3. **Build the VC creation logic** with actual data?
4. **Implement ZK proof generation** for selective disclosure?

All of these will be production-ready with proper error handling and security! 🔐