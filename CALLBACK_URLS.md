# Callback URLs for OAuth Setup

## 🔗 **EXACT CALLBACK URLS TO ADD TO PLATFORMS**

### **🔵 LinkedIn Developer Portal**
- **URL**: https://www.linkedin.com/developers/apps
- **Add this exact callback URL**:
```
https://personapass.xyz/oauth/linkedin/callback
```

### **🟦 X (Twitter) Developer Portal**
- **URL**: https://developer.twitter.com/en/portal/dashboard
- **Add this exact callback URL**:
```
https://personapass.xyz/oauth/twitter/callback
```

### **🟣 Stripe Identity Dashboard**
- **URL**: https://dashboard.stripe.com/identity
- **Add this exact webhook URL**:
```
https://personapass.xyz/api/stripe/identity/webhook
```
- **Add this exact callback URL**:
```
https://personapass.xyz/oauth/stripe-identity/callback
```

---

## 📋 **STEP-BY-STEP SETUP INSTRUCTIONS**

### **LinkedIn Setup:**
1. Go to https://www.linkedin.com/developers/apps
2. Select your app
3. Go to "Auth" tab
4. Add to "Redirect URLs": `https://personapass.xyz/oauth/linkedin/callback`
5. Save changes

### **X (Twitter) Setup:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Go to "App settings" → "Authentication settings"
4. Add to "Callback URLs": `https://personapass.xyz/oauth/twitter/callback`
5. Save changes

### **Stripe Identity Setup:**
1. Go to https://dashboard.stripe.com/identity
2. Go to "Settings" → "Webhooks"
3. Add endpoint: `https://personapass.xyz/api/stripe/identity/webhook`
4. Select events: `identity.verification_session.verified`, `identity.verification_session.requires_input`
5. Save webhook secret for environment variables

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] LinkedIn callback URL added
- [ ] X (Twitter) callback URL added  
- [ ] Stripe webhook URL added
- [ ] Stripe callback URL added
- [ ] Environment variables updated in Vercel
- [ ] Test each OAuth flow

---

**Copy these exact URLs - they're configured to work with your PersonaPass domain!**