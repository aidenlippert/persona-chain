# 🚀 PersonaPass Connectors - Quick Start Guide

## Why You Don't See Changes Yet

**The connectors are just code files right now - they need to be:**
1. ✅ Built and packaged
2. ✅ Connected to OAuth providers 
3. ✅ Deployed and running
4. ✅ Integrated with the frontend

## 🎯 5-Minute Quick Start

### Step 1: Run the Setup Script
```bash
cd persona-chain
./scripts/deploy-connectors.sh
```

This will:
- Install all dependencies
- Generate cryptographic keys
- Create environment templates
- Set up the development environment

### Step 2: Register OAuth Apps (10 minutes)

#### GitHub (2 min)
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   ```
   Application name: PersonaPass Dev
   Homepage URL: http://localhost:5173
   Callback URL: http://localhost:3001/api/v1/github/callback
   ```
4. Copy Client ID and Secret

#### LinkedIn (2 min)
1. Go to: https://www.linkedin.com/developers/
2. Create app → Select "Sign In with LinkedIn"
3. Add products: "Sign In with LinkedIn"
4. OAuth 2.0 settings:
   ```
   Redirect URL: http://localhost:3002/api/v1/linkedin/callback
   ```

#### Other Platforms
Follow similar steps for ORCID, Plaid, Twitter, and StackExchange

### Step 3: Configure Environment (2 min)
```bash
# Copy environment templates
cd apps/connectors
for connector in github linkedin orcid plaid twitter stackexchange; do
  cp $connector/.env.example $connector/.env
done

# Edit each .env file with your OAuth credentials
nano github/.env  # Add your GitHub Client ID and Secret

# Add the generated keys from keys.env to each .env file
cat keys.env  # Copy these values
```

### Step 4: Start Everything (1 min)
```bash
# In the connectors directory
./start-dev.sh
```

This starts:
- ✅ Redis (for sessions)
- ✅ All 6 connector services
- ✅ API Gateway (port 8080)
- ✅ Wallet Frontend (port 5173)

### Step 5: Test It!
1. Open http://localhost:5173
2. Navigate to Credentials section
3. Click "Connect GitHub"
4. Authorize the app
5. See your credential imported! 🎉

## 📱 What You'll See

### Before (Current State)
- Static frontend code
- No live connectors
- No OAuth flow

### After (Running State)
```
┌─────────────────────────────────────┐
│      PersonaPass Credentials        │
├─────────────────────────────────────┤
│                                     │
│  [Connect GitHub]  [Connect LinkedIn]│
│  [Connect ORCID]   [Connect Plaid]   │
│  [Connect Twitter] [Connect Stack]   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔐 Your Imported Credentials │   │
│  ├─────────────────────────────┤   │
│  │ • GitHub: @yourusername     │   │
│  │   42 repos, 100 followers   │   │
│  │   ✓ Privacy-enabled         │   │
│  │   [Share] [Issue] [Revoke]  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### "Cannot connect to connector"
```bash
# Check if services are running
docker ps  # Should show Redis
ps aux | grep node  # Should show connector processes

# Check logs
tail -f apps/connectors/github/logs/dev.log
```

### "OAuth error: redirect_uri_mismatch"
- Make sure callback URL in OAuth app matches exactly
- Include the full path with protocol (http://...)
- No trailing slashes

### "CORS error in browser"
```bash
# Check API gateway is running
curl http://localhost:8080/health

# Verify CORS headers
curl -I http://localhost:8080/api/v1/github/health
```

## 🏗️ Production Deployment (Later)

Once everything works locally:

1. **Build Docker Images**
```bash
docker build -t personapass/connector-github apps/connectors/github
```

2. **Deploy to Cloud**
```bash
# Kubernetes
kubectl apply -f k8s/connectors/

# Or Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

3. **Update OAuth URLs**
- Change localhost to production domain
- Update environment variables
- Configure SSL/TLS

## 📊 Architecture Recap

```
User Browser → Wallet Frontend (:5173)
                     ↓
              API Gateway (:8080)
                     ↓
        ┌────────────┼────────────┐
     GitHub      LinkedIn      ORCID    (Connector Services)
     (:3001)     (:3002)      (:3003)
        ↓            ↓            ↓
     GitHub      LinkedIn      ORCID    (OAuth Providers)
      API          API          API
```

## ✅ Success Checklist

- [ ] Setup script runs successfully
- [ ] OAuth apps registered on platforms
- [ ] Environment variables configured
- [ ] Redis is running
- [ ] Connectors are running
- [ ] Frontend can reach API gateway
- [ ] OAuth flow completes
- [ ] Credentials appear in dashboard
- [ ] ZK proofs generate correctly

## 🎉 You're Ready!

Once you complete these steps, you'll have a fully functional credential connector system running locally. Users can:
- Connect their accounts
- Import verified credentials  
- Generate privacy-preserving proofs
- Share credentials selectively

**Time to see it in action: ~20 minutes total!**

Need help? Check the logs:
```bash
# Connector logs
tail -f apps/connectors/github/logs/*.log

# Frontend logs
# Check browser console (F12)
```