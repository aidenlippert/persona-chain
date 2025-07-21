# Task Completion Checklist

## Before Completing Any Task

### Code Quality Gates
1. **Type Check**: `npm run type-check` must pass
2. **Linting**: `npm run lint` must pass with 0 warnings
3. **Formatting**: `npm run format:check` must pass
4. **Build**: `npm run build` must succeed

### Testing Requirements
1. **Unit Tests**: `npm run test:run` for modified components
2. **Integration Tests**: Relevant protocol tests (OpenID4VP, EUDI, etc.)
3. **E2E Tests**: `npm run test:e2e` for user flows
4. **Security**: `npm run security:check` must pass

### Performance Validation
1. **Bundle Size**: Check with `npm run analyze:bundle`
2. **Load Time**: Verify < 3s on 3G networks
3. **Core Web Vitals**: LCP, FID, CLS thresholds

### Security Validation
1. **No sensitive data** in logs or console
2. **Input validation** for all external data
3. **Proper error handling** without info leakage
4. **HTTPS only** for all network calls

### Documentation Updates
1. Update **component documentation** if new UI added
2. Update **API documentation** if interfaces changed
3. Update **README** if commands/setup changed
4. Update **type definitions** if new types added

## Deployment Readiness
- All TypeScript errors resolved
- All tests passing
- Security audit clean
- Performance within budgets
- Documentation current
- Build artifacts generated successfully