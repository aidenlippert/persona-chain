# PersonaPass Identity Wallet - Production Claude Code Configuration

## 🚀 Mission Critical: Scale-Ready Identity Platform

**Context**: High-velocity startup building decentralized identity infrastructure  
**Standards**: Production-grade, security-first, performance-optimized

## Tech Stack & Dependencies

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + PWA
- **State**: Zustand + React Query + IndexedDB (Dexie)
- **Identity**: W3C VC/VP + DID + OpenID4VP/VCI + EUDI Compliance
- **Security**: WebAuthn + ZK Proofs + Ed25519 + AES-GCM
- **Testing**: Vitest + Playwright + Testing Library
- **Build**: Vite + TypeScript + ESLint + Prettier

### New Enhancements (Just Added)
- **zen-observable-ts**: Enhanced reactive programming
- **@webbio/generator-viper-frontend**: Advanced frontend scaffolding
- **@google/gemini-cli**: AI-powered development tools

## Project Structure

```
persona-chain/
├── apps/wallet/                 # Main PWA application
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── services/          # Business logic & APIs
│   │   ├── stores/            # State management
│   │   ├── types/             # TypeScript definitions
│   │   └── tests/             # Comprehensive test suite
│   ├── dist/                  # Production build artifacts
│   └── public/                # Static assets
├── contracts/                 # CosmWasm smart contracts
├── x/                        # Cosmos SDK modules
└── packages/sdk/             # Verifier SDK
```

## Commands & Shortcuts

### Development
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run type-check` - TypeScript validation
- `npm run test` - Run test suite
- `npm run test:coverage` - Coverage analysis

### Quality Assurance
- `npm run lint` - ESLint check
- `npm run format` - Prettier formatting
- `npm audit` - Security audit
- `npm run e2e` - End-to-end tests

### Production
- `npm run build:prod` - Optimized production build
- `npm run preview` - Preview production build

## Code Standards & Style

### TypeScript
- Strict mode enabled
- Prefer interfaces over types
- Use discriminated unions for complex states
- Always type external API responses

### React Patterns
- Functional components with hooks
- Custom hooks for shared logic
- Error boundaries for robustness
- Lazy loading for performance

### File Naming
- PascalCase for components: `UserProfile.tsx`
- camelCase for utilities: `cryptoUtils.ts`
- kebab-case for test files: `user-profile.test.tsx`

### Import/Export
- Use named exports (not default)
- Destructure imports: `import { useState } from 'react'`
- Group imports: external → internal → relative

## Security Requirements

### Critical Security Rules
- Never log private keys or sensitive data
- Validate all external inputs
- Use constant-time comparisons for crypto
- Implement proper error handling without leaking info
- Always use HTTPS in production

### Identity & Crypto
- Use WebAuthn for biometric authentication
- Implement zero-knowledge proofs correctly
- Follow W3C standards for VCs/VPs
- Secure key storage with encryption

## Performance Targets

### Bundle Size
- Main bundle: < 1MB
- Lazy-loaded chunks: < 500KB
- CSS: < 100KB

### Runtime Performance
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- ZK Proof generation: < 2s

## Testing Strategy

### Coverage Requirements
- Unit tests: 90%+ coverage
- Integration tests: All critical paths
- E2E tests: Complete user workflows
- Security tests: Penetration testing

### Test Structure
- co-locate tests with source files
- Use descriptive test names
- Mock external dependencies
- Test error conditions

## Repository Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Standards
- Use conventional commits
- Include ticket numbers
- Keep commits atomic
- Write clear messages

## Development Environment

### Required Tools
- Node.js 18+
- npm 9+
- TypeScript 5.2+
- Git

### IDE Setup
- VS Code with extensions:
  - TypeScript
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

## File Types & Purpose

### Never Modify
- `package-lock.json` - Dependency lockfile
- `dist/` - Build artifacts
- `node_modules/` - Dependencies

### Core Files
- `src/main.tsx` - Application entry point
- `src/App.tsx` - Root component
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration

## AI Development Guidelines

### When Using Claude Code
1. **Think First**: Use "think" or "think hard" for complex problems
2. **Context Matters**: Reference this file for project standards
3. **Iterate Rapidly**: Make small, testable changes
4. **Validate Everything**: Run tests after changes
5. **Document Changes**: Update this file when needed

### Gemini CLI Integration
- Use for code generation and optimization
- Validate generated code against our standards
- Integrate with existing workflows

### Observable Patterns
- Use zen-observable-ts for reactive streams
- Implement proper error handling
- Follow functional programming principles

## Team Collaboration

### Communication
- Use GitHub issues for tasks
- PR reviews required for main branch
- Daily standups for alignment
- Document decisions in code

### Knowledge Sharing
- Keep this file updated
- Share useful patterns
- Document gotchas and solutions
- Mentor junior developers

## Performance Monitoring

### Metrics to Track
- Bundle size changes
- Test coverage
- Build times
- Runtime performance

### Tools
- Lighthouse for web vitals
- Bundle analyzer for optimization
- Sentry for error tracking
- GitHub Actions for CI/CD

---

**Remember**: We're building the future of digital identity. Every commit matters. Every decision affects millions of users. Code like the decentralized web depends on it.

*Last updated: January 14, 2025*