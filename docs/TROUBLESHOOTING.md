# PersonaPass Troubleshooting Guide 🔧

> **Comprehensive troubleshooting guide** - Solve common issues, debug problems, and maintain optimal performance for your PersonaPass Identity Platform deployment.

## 📋 Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Common Issues](#common-issues)
- [Performance Problems](#performance-problems)
- [Security Issues](#security-issues)
- [Integration Problems](#integration-problems)
- [Database Issues](#database-issues)
- [Blockchain Problems](#blockchain-problems)
- [Monitoring & Logging](#monitoring--logging)

## 🩺 Quick Diagnosis

### 🚀 Health Check Commands

#### System Health Check
```bash
#!/bin/bash
# health-check.sh - Quick system diagnosis

echo "🔍 PersonaPass System Health Check"
echo "=================================="

# Check service status
echo "📊 Service Status:"
kubectl get pods -n personapass -o wide
echo ""

# Check ingress
echo "🌐 Ingress Status:"
kubectl get ingress -n personapass
echo ""

# Check persistent volumes
echo "💾 Storage Status:"
kubectl get pv,pvc -n personapass
echo ""

# Check resource usage
echo "📈 Resource Usage:"
kubectl top pods -n personapass
echo ""

# API health check
echo "🔍 API Health:"
curl -s https://api.personapass.id/health | jq '.' || echo "❌ API not responding"
echo ""

# Database connection test
echo "💾 Database Health:"
kubectl exec -n personapass deployment/personapass-api -- npm run db:health-check
echo ""

# Redis connection test
echo "🗄️ Cache Health:"
kubectl exec -n personapass deployment/personapass-redis -- redis-cli ping
echo ""

# Blockchain status
echo "⛓️ Blockchain Health:"
curl -s http://localhost:26657/health | jq '.' || echo "❌ Blockchain not responding"
echo ""

echo "✅ Health check completed!"
```

#### Performance Quick Check
```bash
#!/bin/bash
# performance-check.sh

echo "⚡ Performance Quick Check"
echo "========================="

# API response time
echo "🚀 API Response Time:"
time curl -s https://api.personapass.id/health > /dev/null
echo ""

# Database query performance
echo "💾 Database Performance:"
kubectl exec -n personapass deployment/personapass-api -- npm run db:performance-test
echo ""

# Memory usage
echo "🧠 Memory Usage:"
kubectl top pods -n personapass --sort-by=memory
echo ""

# CPU usage
echo "💻 CPU Usage:"
kubectl top pods -n personapass --sort-by=cpu
echo ""

# Disk usage
echo "💽 Disk Usage:"
kubectl exec -n personapass deployment/personapass-postgres -- df -h
echo ""
```

### 🚨 Emergency Diagnostic Script
```bash
#!/bin/bash
# emergency-diagnostic.sh - Comprehensive emergency diagnosis

NAMESPACE="personapass"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="emergency_report_${TIMESTAMP}"

mkdir -p "${REPORT_DIR}"

echo "🚨 Emergency Diagnostic Report - ${TIMESTAMP}" > "${REPORT_DIR}/summary.txt"
echo "================================================" >> "${REPORT_DIR}/summary.txt"

# Collect all pod logs
echo "📝 Collecting pod logs..."
for pod in $(kubectl get pods -n $NAMESPACE -o name); do
    pod_name=$(echo $pod | cut -d'/' -f2)
    kubectl logs -n $NAMESPACE $pod --tail=1000 > "${REPORT_DIR}/${pod_name}.log" 2>&1
    kubectl logs -n $NAMESPACE $pod --previous --tail=1000 > "${REPORT_DIR}/${pod_name}_previous.log" 2>&1
done

# Collect pod descriptions
echo "📋 Collecting pod descriptions..."
kubectl describe pods -n $NAMESPACE > "${REPORT_DIR}/pod_descriptions.txt"

# Collect events
echo "📅 Collecting events..."
kubectl get events -n $NAMESPACE --sort-by='.metadata.creationTimestamp' > "${REPORT_DIR}/events.txt"

# Collect resource usage
echo "📊 Collecting resource usage..."
kubectl top pods -n $NAMESPACE > "${REPORT_DIR}/resource_usage.txt"

# Collect service status
echo "🔍 Collecting service status..."
kubectl get all -n $NAMESPACE -o wide > "${REPORT_DIR}/service_status.txt"

# Collect ingress status
echo "🌐 Collecting ingress status..."
kubectl get ingress -n $NAMESPACE -o yaml > "${REPORT_DIR}/ingress_status.yaml"

# Collect persistent volume status
echo "💾 Collecting storage status..."
kubectl get pv,pvc -n $NAMESPACE -o wide > "${REPORT_DIR}/storage_status.txt"

# Network connectivity tests
echo "🌐 Testing network connectivity..."
{
    echo "=== API Health Check ==="
    curl -v https://api.personapass.id/health 2>&1
    echo -e "\n=== Wallet Health Check ==="
    curl -v https://wallet.personapass.id/ 2>&1
    echo -e "\n=== Database Connection ==="
    kubectl exec -n $NAMESPACE deployment/personapass-api -- nc -zv personapass-postgres 5432 2>&1
    echo -e "\n=== Redis Connection ==="
    kubectl exec -n $NAMESPACE deployment/personapass-api -- nc -zv personapass-redis 6379 2>&1
} > "${REPORT_DIR}/connectivity_tests.txt"

# Create summary
echo "📄 Creating summary..."
{
    echo "Emergency Diagnostic Summary"
    echo "============================"
    echo "Timestamp: ${TIMESTAMP}"
    echo "Namespace: ${NAMESPACE}"
    echo ""
    echo "Pod Status:"
    kubectl get pods -n $NAMESPACE
    echo ""
    echo "Recent Events:"
    kubectl get events -n $NAMESPACE --sort-by='.metadata.creationTimestamp' | tail -10
    echo ""
    echo "Resource Usage:"
    kubectl top pods -n $NAMESPACE
} >> "${REPORT_DIR}/summary.txt"

echo "✅ Emergency diagnostic completed! Report saved to: ${REPORT_DIR}"
echo "📧 Send this report to support: support@personapass.id"
```

## ⚠️ Common Issues

### 🚫 Issue: API Not Responding

#### Symptoms
- HTTP 502/503 errors
- Timeouts when accessing API endpoints
- `curl: (7) Failed to connect` errors

#### Diagnosis
```bash
# Check pod status
kubectl get pods -n personapass -l app=personapass-api

# Check pod logs
kubectl logs -n personapass deployment/personapass-api --tail=50

# Check service endpoints
kubectl get endpoints -n personapass personapass-api

# Test internal connectivity
kubectl exec -n personapass deployment/personapass-api -- curl localhost:3001/health
```

#### Solutions

**1. Pod Restart Issue**
```bash
# Check if pods are in CrashLoopBackOff
kubectl get pods -n personapass

# If pods are crashing, check logs
kubectl logs -n personapass <pod-name> --previous

# Common fixes:
# - Update resource limits
# - Fix environment variables
# - Check database connectivity
```

**2. Database Connection Issue**
```bash
# Test database connectivity
kubectl exec -n personapass deployment/personapass-api -- \
  psql postgresql://personapass:password@personapass-postgres:5432/personapass -c "SELECT 1;"

# If connection fails:
# - Check database pod status
# - Verify credentials in secrets
# - Check network policies
```

**3. Memory/CPU Limits**
```yaml
# Update resource limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personapass-api
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

### 🔐 Issue: Authentication Failures

#### Symptoms
- "Invalid token" errors
- JWT verification failures
- Biometric authentication not working

#### Diagnosis
```bash
# Check auth service logs
kubectl logs -n personapass deployment/personapass-api | grep -i auth

# Test JWT generation
kubectl exec -n personapass deployment/personapass-api -- \
  node -e "console.log(require('jsonwebtoken').sign({test: true}, process.env.JWT_SECRET))"

# Check biometric service status
curl -s https://api.personapass.id/auth/biometric/status
```

#### Solutions

**1. JWT Secret Issues**
```bash
# Verify JWT secret exists
kubectl get secret -n personapass personapass-secrets -o yaml | grep JWT_SECRET

# Update JWT secret if needed
kubectl patch secret -n personapass personapass-secrets \
  -p '{"data":{"JWT_SECRET":"'$(echo -n "new-jwt-secret" | base64)'"}}'

# Restart API pods to pick up new secret
kubectl rollout restart deployment/personapass-api -n personapass
```

**2. Clock Synchronization**
```bash
# Check system time on nodes
kubectl get nodes -o wide

# Check pod time
kubectl exec -n personapass deployment/personapass-api -- date

# Fix: Ensure NTP is configured on all nodes
```

**3. Biometric Service Issues**
```bash
# Check Keyless SDK status
kubectl exec -n personapass deployment/personapass-api -- \
  curl -s https://api.keyless.io/health

# Check biometric enrollment
curl -s https://api.personapass.id/biometric/enrollment/status \
  -H "Authorization: Bearer <token>"
```

### 📱 Issue: Mobile App Not Working

#### Symptoms
- QR codes not scanning
- Deep links not opening wallet
- Android Digital Credentials not working

#### Diagnosis
```bash
# Check QR code generation
curl -s https://api.personapass.id/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'

# Check deep link redirects
curl -I https://wallet.personapass.id/verify?request=test

# Test Android integration
adb logcat | grep PersonaPass
```

#### Solutions

**1. QR Code Issues**
```typescript
// Debug QR code generation
const qrCodeDebug = {
  data: request.presentationDefinition,
  format: 'png',
  size: 256,
  errorLevel: 'M'
};

console.log('QR Code Debug:', qrCodeDebug);
```

**2. Deep Link Issues**
```bash
# Test deep link handling
curl -L https://wallet.personapass.id/verify?request=<request-id>

# Check if wallet app is registered for deep links
adb shell am start -W -a android.intent.action.VIEW \
  -d "personapass://verify?request=test" \
  com.personapass.wallet
```

**3. Android Digital Credentials**
```kotlin
// Check Android API level and feature support
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
    val credentialManager = CredentialManager.create(context)
    // Debug credential manager availability
}
```

### 💾 Issue: Database Performance Problems

#### Symptoms
- Slow query responses
- Connection timeouts
- High CPU usage on database

#### Diagnosis
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check database size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Solutions

**1. Connection Pool Optimization**
```typescript
// Update connection pool settings
const dbConfig = {
  host: 'personapass-postgres',
  port: 5432,
  database: 'personapass',
  username: 'personapass',
  password: process.env.DATABASE_PASSWORD,
  pool: {
    min: 10,
    max: 30,
    idle: 10000,
    acquire: 60000,
    evict: 5000
  }
};
```

**2. Index Optimization**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_credentials_subject_did 
ON credentials(subject_did);

CREATE INDEX CONCURRENTLY idx_presentations_created_at 
ON presentations(created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM credentials 
WHERE subject_did = 'did:key:example' 
ORDER BY created_at DESC;
```

**3. Database Maintenance**
```bash
# Schedule regular maintenance
kubectl create job --from=cronjob/postgres-maintenance postgres-maintenance-manual -n personapass

# Manual vacuum
kubectl exec -n personapass deployment/personapass-postgres -- \
  psql -U personapass -d personapass -c "VACUUM ANALYZE;"
```

## ⚡ Performance Problems

### 🐌 Issue: Slow API Response Times

#### Symptoms
- Response times > 5 seconds
- Timeouts under normal load
- High CPU/memory usage

#### Diagnosis
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.personapass.id/health

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}\n
#     time_connect:     %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#     time_pretransfer: %{time_pretransfer}\n
#     time_redirect:    %{time_redirect}\n
#     time_starttransfer: %{time_starttransfer}\n
#     time_total:       %{time_total}\n

# Check API metrics
curl -s https://api.personapass.id/metrics | grep api_request_duration

# Profile API endpoints
kubectl exec -n personapass deployment/personapass-api -- \
  npm run profile -- --endpoint=/credentials
```

#### Solutions

**1. Enable Caching**
```typescript
// Implement Redis caching
class CacheService {
  async get(key: string): Promise<any> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Cache expensive operations
const getCachedCredentials = async (userId: string) => {
  const cacheKey = `credentials:${userId}`;
  let credentials = await cache.get(cacheKey);
  
  if (!credentials) {
    credentials = await database.getCredentials(userId);
    await cache.set(cacheKey, credentials, 1800); // 30 minutes
  }
  
  return credentials;
};
```

**2. Database Query Optimization**
```typescript
// Optimize database queries
const getCredentialsOptimized = async (userId: string, limit: number = 10) => {
  return await database.query(`
    SELECT c.id, c.type, c.issuer_did, c.created_at
    FROM credentials c
    USE INDEX (idx_credentials_user_created)
    WHERE c.user_id = ? 
    ORDER BY c.created_at DESC
    LIMIT ?
  `, [userId, limit]);
};

// Implement pagination
const getCredentialsPaginated = async (userId: string, offset: number, limit: number) => {
  return await database.query(`
    SELECT * FROM credentials 
    WHERE user_id = ? 
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);
};
```

**3. Horizontal Scaling**
```yaml
# Increase replica count
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personapass-api
spec:
  replicas: 10  # Increase from 6 to 10
  
# Add Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: personapass-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: personapass-api
  minReplicas: 6
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 🧠 Issue: High Memory Usage

#### Symptoms
- OOMKilled pods
- Memory usage > 90%
- Frequent garbage collection

#### Diagnosis
```bash
# Check memory usage
kubectl top pods -n personapass --sort-by=memory

# Get detailed memory info
kubectl exec -n personapass deployment/personapass-api -- \
  node -e "console.log(process.memoryUsage())"

# Check for memory leaks
kubectl exec -n personapass deployment/personapass-api -- \
  node --expose-gc -e "
    setInterval(() => {
      global.gc();
      console.log(process.memoryUsage());
    }, 5000);
  "
```

#### Solutions

**1. Memory Optimization**
```typescript
// Implement memory-efficient data structures
class MemoryEfficientCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private maxSize = 1000;
  
  set(key: string, value: any, ttl: number): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

// Stream large responses
app.get('/credentials/export', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');
  
  const stream = database.getCredentialsStream(req.user.id);
  let first = true;
  
  stream.on('data', (credential) => {
    if (!first) res.write(',');
    res.write(JSON.stringify(credential));
    first = false;
  });
  
  stream.on('end', () => {
    res.write(']');
    res.end();
  });
});
```

**2. Resource Limits**
```yaml
# Set appropriate resource limits
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi  # Increased from 2Gi

# Configure Node.js memory settings
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=3072"  # 3GB max heap
```

## 🛡️ Security Issues

### 🚨 Issue: Security Vulnerabilities

#### Symptoms
- Security scanner alerts
- Suspicious login attempts
- Unauthorized access logs

#### Diagnosis
```bash
# Check security logs
kubectl logs -n personapass deployment/personapass-api | grep -i "security\|unauthorized\|failed"

# Check failed authentication attempts
curl -s https://api.personapass.id/admin/security/failed-attempts \
  -H "Authorization: Bearer <admin-token>"

# Scan for vulnerabilities
trivy image personapass/api:v1.0.0
```

#### Solutions

**1. Update Dependencies**
```bash
# Check for vulnerable dependencies
npm audit

# Update dependencies
npm audit fix

# Update Docker base images
docker pull node:18-alpine
docker build -t personapass/api:v1.0.1 .
```

**2. Implement Rate Limiting**
```typescript
// Enhanced rate limiting
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log security event
    await securityLogger.log('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(req.rateLimit.resetTime)
    });
  }
});

app.use('/auth', authLimiter);
```

**3. Security Headers**
```typescript
// Implement security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 🔐 Issue: Certificate Problems

#### Symptoms
- SSL/TLS certificate errors
- "Certificate has expired" messages
- Browser security warnings

#### Diagnosis
```bash
# Check certificate expiry
echo | openssl s_client -servername api.personapass.id -connect api.personapass.id:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
curl -vI https://api.personapass.id

# Check cert-manager status
kubectl get certificates -n personapass
kubectl describe certificate personapass-tls -n personapass
```

#### Solutions

**1. Renew Certificates**
```bash
# Force certificate renewal
kubectl delete certificate personapass-tls -n personapass

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Manual certificate renewal
kubectl annotate certificate personapass-tls -n personapass \
  cert-manager.io/force-renewal="$(date +%s)"
```

**2. DNS Configuration**
```bash
# Verify DNS records
dig api.personapass.id A
dig wallet.personapass.id A

# Check DNS propagation
nslookup api.personapass.id 8.8.8.8
nslookup api.personapass.id 1.1.1.1
```

## 🔗 Integration Problems

### 🤝 Issue: Third-Party Integration Failures

#### Symptoms
- Webhook delivery failures
- OAuth authentication errors
- External API timeouts

#### Diagnosis
```bash
# Check webhook delivery status
curl -s https://api.personapass.id/admin/webhooks/status \
  -H "Authorization: Bearer <admin-token>"

# Test external API connectivity
kubectl exec -n personapass deployment/personapass-api -- \
  curl -v https://api.keyless.io/health

# Check OAuth configuration
curl -s https://api.personapass.id/.well-known/openid_configuration
```

#### Solutions

**1. Webhook Retry Logic**
```typescript
// Implement webhook retry with exponential backoff
class WebhookService {
  async deliverWebhook(url: string, payload: any, attempt: number = 1): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PersonaPass-Signature': this.generateSignature(payload)
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      await this.logWebhookSuccess(url, payload);
    } catch (error) {
      if (attempt < 5) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        setTimeout(() => {
          this.deliverWebhook(url, payload, attempt + 1);
        }, delay);
      } else {
        await this.logWebhookFailure(url, payload, error);
      }
    }
  }
}
```

**2. Circuit Breaker Pattern**
```typescript
// Implement circuit breaker for external APIs
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) { // 1 minute
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## 📊 Monitoring & Logging

### 📈 Performance Monitoring

#### Setup Application Performance Monitoring
```typescript
// APM integration
import { NodeSDK } from '@opentelemetry/sdk-node';
import { jaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: jaegerExporter({
    endpoint: 'http://jaeger-collector:14268/api/traces'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': {
        enabled: true
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true
      }
    })
  ]
});

sdk.start();
```

#### Custom Metrics
```typescript
// Custom metrics collection
import { createPrometheusMetrics } from 'prometheus-api-metrics';

const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  credentialOperations: new Counter({
    name: 'credential_operations_total',
    help: 'Total credential operations',
    labelNames: ['operation', 'status']
  }),
  
  zkProofGeneration: new Histogram({
    name: 'zk_proof_generation_seconds',
    help: 'Time taken to generate ZK proofs',
    labelNames: ['circuit_type']
  })
};

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
});
```

### 📝 Structured Logging

#### Logging Configuration
```typescript
// Structured logging setup
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'personapass-api',
    version: process.env.npm_package_version
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/app/logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/app/logs/combined.log'
    })
  ]
});

// Security event logging
export const securityLogger = {
  logAuthFailure: (req: Request, error: Error) => {
    logger.warn('Authentication failure', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  },
  
  logSuspiciousActivity: (userId: string, activity: string, details: any) => {
    logger.warn('Suspicious activity detected', {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  }
};
```

### 🚨 Alerting Configuration

#### Prometheus Alert Rules
```yaml
# alert-rules.yml
groups:
- name: personapass-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} per second"
  
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"
  
  - alert: DatabaseConnectionFailure
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database connection failure"
      description: "PostgreSQL database is down"
  
  - alert: HighMemoryUsage
    expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value | humanizePercentage }}"
```

---

<div align="center">

**🔧 When in doubt, debug it out**

[📖 Back to Documentation](README.md) | [📞 Get Support](https://support.personapass.id) | [💬 Community Help](https://discord.gg/personapass)

*Solving problems, one debug at a time* 🚀

</div>