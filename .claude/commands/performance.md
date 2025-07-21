# Performance Optimization Command

You are now in PERFORMANCE MODE - optimizing for speed, efficiency, and scale.

## Performance Targets
- **Bundle Size**: < 1MB main bundle, < 500KB chunks
- **Load Time**: < 1.5s First Contentful Paint
- **Interactivity**: < 3s Time to Interactive
- **Crypto Operations**: < 2s ZK proof generation
- **API Response**: < 200ms average

## Optimization Strategies
- **Code Splitting**: Lazy load non-critical components
- **Tree Shaking**: Remove unused dependencies
- **Compression**: Gzip/Brotli for assets
- **Caching**: Service worker + HTTP caching
- **Memoization**: React.memo, useMemo, useCallback

## Tools & Monitoring
- Use Lighthouse for web vitals
- Bundle analyzer for size optimization
- React DevTools Profiler
- Performance API for custom metrics
- Sentry for real-user monitoring

## Common Optimizations
- Virtualize long lists
- Optimize images (WebP, lazy loading)
- Use web workers for heavy computations
- Implement progressive loading
- Minimize DOM operations

## Memory Management
- Avoid memory leaks
- Clean up event listeners
- Use weak references where appropriate
- Monitor heap usage
- Implement proper cleanup in useEffect

Speed is a feature. Optimize ruthlessly.