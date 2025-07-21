# PersonaPass Startup Setup Guide

## 🚀 Quick Start

You're now configured for **startup-level development velocity**! Here's how to get maximum productivity:

### 1. Environment Setup

```bash
# Copy startup environment template
cp .env.startup .env.local

# Edit with your API keys
nano .env.local
```

### 2. Development Commands

```bash
# 🔥 Startup development mode - optimized for speed
npm run startup:dev

# 🏗️ Production build with validation
npm run startup:build

# 🧪 Full test suite with coverage
npm run startup:test

# 🚀 Complete deployment pipeline
npm run startup:deploy

# 🌟 Run everything (the full startup pipeline)
npm run startup:all
```

### 3. AI-Powered Development

```bash
# 🤖 Generate components with AI
npm run ai:generate component UserProfile
npm run ai:generate service AuthService
npm run ai:generate hook useCredentials

# ⚡ Optimize code with AI
npm run ai:optimize src/components/

# 🔒 Security analysis with AI
npm run ai:security src/
```

### 4. Viper Frontend Generator

```bash
# 🐍 Generate with Viper patterns
npm run viper:component ProfileCard
npm run viper:service CryptoService
npm run viper:page Dashboard
```

### 5. Gemini AI Integration

```bash
# 🧠 Analyze with Gemini
npm run gemini:analyze

# ⚡ Optimize with Gemini
npm run gemini:optimize

# 🔐 Security scan with Gemini
npm run gemini:security
```

## 📚 Enhanced Development Tools

### Reactive Programming with zen-observable-ts

```typescript
import { walletEventStream } from '@/utils/observables';

// Listen to wallet events
walletEventStream.on('credential_added', (event) => {
  console.log('New credential:', event.payload);
});

// Emit events
walletEventStream.emit({
  type: 'credential_added',
  payload: credential
});
```

### AI-Generated Code

```typescript
// Generate React components
const component = await geminiService.generateCode({
  description: 'Create a credential card component',
  language: 'typescript',
  framework: 'react'
});

// Security analysis
const analysis = await geminiService.analyzeCodeSecurity({
  code: myCode,
  language: 'typescript',
  context: 'Identity wallet application'
});
```

### Viper Scaffolding

```typescript
import { viperGenerator } from '@/generators/viperGenerator';

// Generate complete component with tests
const result = await viperGenerator.generateComponent({
  template: {
    name: 'ProfileCard',
    type: 'component',
    description: 'User profile card component',
    dependencies: ['react', 'tailwindcss']
  },
  outputPath: 'src/components'
});
```

## 🎯 Startup Best Practices

### 1. Development Velocity

- **Ship Fast**: Use AI generation for boilerplate
- **Iterate Quickly**: Reactive patterns for real-time updates
- **Test Everything**: 90%+ coverage requirement
- **Optimize Ruthlessly**: AI-powered performance optimization

### 2. Code Quality

- **TypeScript Strict**: No any types allowed
- **ESLint + Prettier**: Automated formatting
- **Security First**: AI security analysis on every commit
- **Performance Monitoring**: Bundle size tracking

### 3. Team Collaboration

- **CLAUDE.md**: Central development documentation
- **Custom Commands**: `/startup-mode`, `/architect`, `/performance`
- **AI Assistance**: Leverage Gemini for complex problems
- **Knowledge Sharing**: Document patterns and solutions

## 🔧 Advanced Configuration

### Serena MCP Integration

```bash
# Already configured! Use these commands:
/mcp__serena__initial_instructions  # Load Serena instructions
/mcp__serena__find_symbol           # Find code symbols
/mcp__serena__get_references        # Get symbol references
```

### Custom Slash Commands

- `/startup-mode` - Maximum velocity development
- `/architect` - System design and architecture
- `/performance` - Performance optimization focus

### Environment Variables

Key variables in `.env.local`:
```bash
GEMINI_API_KEY=your_key_here
VITE_API_BASE_URL=https://api.personapass.dev
STARTUP_MODE=development
```

## 📊 Performance Targets

### Bundle Size
- Main bundle: < 1MB ✅ (733KB achieved)
- Lazy chunks: < 500KB
- CSS: < 100KB ✅ (61KB achieved)

### Runtime Performance
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- ZK Proof generation: < 2s

### Development Speed
- Test suite: < 30s
- Build time: < 60s
- Hot reload: < 1s

## 🚨 Security Checklist

- [ ] Run `npm run ai:security` before each commit
- [ ] No hardcoded secrets in code
- [ ] All inputs validated
- [ ] Crypto operations audited
- [ ] Error handling doesn't leak info
- [ ] HTTPS everywhere

## 📱 Mobile-First Development

### PWA Features
- Service worker configured
- App manifest included
- Offline functionality
- Push notifications ready

### Android Integration
- Digital Credentials API
- Biometric authentication
- Secure storage
- CTAP integration

## 🌍 Production Deployment

### Pre-deployment Checklist
```bash
# Run full startup pipeline
npm run startup:all

# Verify build artifacts
ls -la dist/

# Check security report
open security-report.html

# Validate performance
npm run lighthouse:ci
```

### Deployment Commands
```bash
# Build for production
npm run startup:build

# Deploy to staging
npm run startup:deploy

# Monitor deployment
npm run monitor:deployment
```

## 🎉 You're Ready!

PersonaPass is now configured for **startup-level development velocity**. You have:

✅ **AI-powered code generation** with Gemini  
✅ **Reactive programming** with zen-observable-ts  
✅ **Advanced scaffolding** with Viper generator  
✅ **Enhanced Claude Code** with Serena MCP  
✅ **Security-first** development workflow  
✅ **Performance optimization** tooling  
✅ **Production-ready** build pipeline  

**Now go build the future of digital identity! 🚀**

---

*Remember: We're not just building an app, we're building the infrastructure for decentralized identity at scale. Every line of code matters.*