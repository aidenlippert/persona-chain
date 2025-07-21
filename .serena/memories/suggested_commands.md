# PersonaPass Development Commands

## Essential Commands

### Development
```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Production build (TypeScript + Vite)
npm run preview         # Preview production build
```

### Code Quality
```bash
npm run type-check      # TypeScript type checking
npm run lint           # ESLint code analysis
npm run lint:fix       # Auto-fix linting issues
npm run format         # Prettier code formatting
npm run format:check   # Check formatting
```

### Testing
```bash
npm run test           # Run unit tests (Vitest)
npm run test:run       # Run tests once
npm run test:coverage  # Generate coverage report
npm run test:e2e       # Playwright E2E tests
npm run test:ui        # Vitest UI
```

### Specialized Testing
```bash
npm run test:openid4vp        # OpenID4VP protocol tests
npm run test:eudi-compliance  # EUDI compliance tests
npm run test:biometric        # Biometric auth tests
npm run test:android-api      # Android integration tests
```

### Security & Performance
```bash
npm run security:check       # Security audit
npm audit --audit-level=high # npm security audit
```

### Cleanup
```bash
npm run clean               # Remove build artifacts
```

## Startup Workflows
```bash
npm run startup:dev         # Clean + type-check + dev
npm run startup:build       # Clean + type-check + build
npm run startup:test        # Type-check + coverage
npm run startup:all         # Complete validation
```