# PersonaPass Deployment Guide 🚀

> **Production deployment documentation** - Complete guide for deploying PersonaPass Identity Platform to production environments with enterprise-grade reliability, security, and scalability.

## 📋 Table of Contents

- [Deployment Overview](#deployment-overview)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Provider Guides](#cloud-provider-guides)
- [Security Configuration](#security-configuration)
- [Monitoring & Observability](#monitoring--observability)
- [Disaster Recovery](#disaster-recovery)

## 🌐 Deployment Overview

PersonaPass supports multiple deployment strategies for different environments and requirements:

### 🏗️ Deployment Architectures

```mermaid
graph TB
    subgraph "Single Region"
        LB1[Load Balancer]
        APP1[App Servers]
        DB1[(Database)]
        CACHE1[(Cache)]
    end
    
    subgraph "Multi-Region"
        GLB[Global Load Balancer]
        
        subgraph "Region A"
            LB2[Load Balancer]
            APP2[App Servers]
            DB2[(Database)]
            CACHE2[(Cache)]
        end
        
        subgraph "Region B"
            LB3[Load Balancer]
            APP3[App Servers]
            DB3[(Database)]
            CACHE3[(Cache)]
        end
    end
    
    subgraph "Hybrid Cloud"
        CLOUD[Cloud Services]
        ONPREM[On-Premise]
        EDGE[Edge Locations]
    end
    
    GLB --> LB2
    GLB --> LB3
    DB2 -.-> DB3
    CACHE2 -.-> CACHE3
    
    CLOUD --> ONPREM
    CLOUD --> EDGE
```

### 📊 Deployment Options

| Deployment Type | Use Case | Complexity | Scalability | Cost |
|----------------|----------|------------|-------------|------|
| **Docker Compose** | Development, small production | Low | Limited | Low |
| **Kubernetes** | Production, enterprise | Medium | High | Medium |
| **Cloud Native** | Managed services, global scale | High | Very High | High |
| **Hybrid** | Compliance, data sovereignty | Very High | High | Very High |

## 🔧 Infrastructure Requirements

### 💻 Minimum System Requirements

#### Small Deployment (< 1000 users)
```yaml
# Application Servers
app_servers:
  count: 2
  cpu: 4 vCPU
  memory: 8 GB RAM
  storage: 100 GB SSD
  network: 1 Gbps

# Database Server
database:
  cpu: 4 vCPU
  memory: 16 GB RAM
  storage: 500 GB SSD (IOPS: 3000)
  backup_storage: 1 TB

# Cache Server
cache:
  cpu: 2 vCPU
  memory: 8 GB RAM
  storage: 50 GB SSD

# Load Balancer
load_balancer:
  cpu: 2 vCPU
  memory: 4 GB RAM
  bandwidth: 10 Gbps
```

#### Medium Deployment (1K - 100K users)
```yaml
# Application Servers
app_servers:
  count: 6
  cpu: 8 vCPU
  memory: 16 GB RAM
  storage: 200 GB SSD
  network: 10 Gbps

# Database Cluster
database_cluster:
  primary:
    cpu: 8 vCPU
    memory: 32 GB RAM
    storage: 2 TB SSD (IOPS: 10000)
  replicas: 2
  backup_storage: 5 TB

# Cache Cluster
cache_cluster:
  nodes: 3
  cpu: 4 vCPU
  memory: 16 GB RAM
  storage: 100 GB SSD

# Load Balancer
load_balancer:
  cpu: 4 vCPU
  memory: 8 GB RAM
  bandwidth: 25 Gbps
```

#### Large Deployment (100K+ users)
```yaml
# Application Servers
app_servers:
  count: 20+
  cpu: 16 vCPU
  memory: 32 GB RAM
  storage: 500 GB SSD
  network: 25 Gbps

# Database Cluster
database_cluster:
  primary:
    cpu: 32 vCPU
    memory: 128 GB RAM
    storage: 10 TB SSD (IOPS: 50000)
  replicas: 5
  backup_storage: 50 TB

# Cache Cluster
cache_cluster:
  nodes: 6
  cpu: 8 vCPU
  memory: 32 GB RAM
  storage: 500 GB SSD

# Load Balancer
load_balancer:
  ha_pair: true
  cpu: 8 vCPU
  memory: 16 GB RAM
  bandwidth: 100 Gbps
```

### 🌐 Network Requirements

#### Security Groups / Firewall Rules
```yaml
# Public Subnet (Load Balancer)
public_subnet:
  inbound:
    - port: 80, 443
      source: 0.0.0.0/0
      protocol: TCP
    - port: 22
      source: bastion_subnet
      protocol: TCP
  outbound:
    - port: all
      destination: private_subnet
      protocol: TCP

# Private Subnet (Application Servers)
private_subnet:
  inbound:
    - port: 3000-3010
      source: public_subnet
      protocol: TCP
    - port: 22
      source: bastion_subnet
      protocol: TCP
  outbound:
    - port: 5432
      destination: database_subnet
      protocol: TCP
    - port: 6379
      destination: cache_subnet
      protocol: TCP
    - port: 80, 443
      destination: 0.0.0.0/0
      protocol: TCP

# Database Subnet
database_subnet:
  inbound:
    - port: 5432
      source: private_subnet
      protocol: TCP
  outbound:
    - port: 5432
      destination: backup_subnet
      protocol: TCP
```

## ☸️ Kubernetes Deployment

### 🎯 Complete Kubernetes Setup

#### Namespace Configuration
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: personapass
  labels:
    name: personapass
    security.enforcement: strict
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: personapass-quota
  namespace: personapass
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40" 
    limits.memory: 80Gi
    persistentvolumeclaims: "10"
    services: "20"
    secrets: "50"
    configmaps: "50"
```

#### ConfigMap Configuration
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: personapass-config
  namespace: personapass
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_BASE_URL: "https://api.personapass.id"
  DATABASE_HOST: "personapass-postgres"
  REDIS_HOST: "personapass-redis"
  BLOCKCHAIN_RPC_URL: "http://personapass-blockchain:26657"
  ENABLE_METRICS: "true"
  ENABLE_TRACING: "true"
  CORS_ORIGINS: "https://wallet.personapass.id,https://demo.personapass.id"
  RATE_LIMIT_WINDOW: "60000"
  RATE_LIMIT_MAX: "100"
```

#### Secrets Configuration
```yaml
# secrets.yaml (encrypted with kubeseal or similar)
apiVersion: v1
kind: Secret
metadata:
  name: personapass-secrets
  namespace: personapass
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  API_KEY_SECRET: <base64-encoded-api-secret>
  WEBHOOK_SECRET: <base64-encoded-webhook-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  BLOCKCHAIN_MNEMONIC: <base64-encoded-mnemonic>
```

#### Database Deployment
```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: personapass-postgres
  namespace: personapass
spec:
  serviceName: personapass-postgres
  replicas: 1
  selector:
    matchLabels:
      app: personapass-postgres
  template:
    metadata:
      labels:
        app: personapass-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: personapass
        - name: POSTGRES_USER
          value: personapass
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: personapass-secrets
              key: DATABASE_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
          limits:
            cpu: 2000m
            memory: 8Gi
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - personapass
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - personapass
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
---
apiVersion: v1
kind: Service
metadata:
  name: personapass-postgres
  namespace: personapass
spec:
  selector:
    app: personapass-postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

#### Redis Cache Deployment
```yaml
# redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personapass-redis
  namespace: personapass
spec:
  replicas: 3
  selector:
    matchLabels:
      app: personapass-redis
  template:
    metadata:
      labels:
        app: personapass-redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        args:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --maxmemory
        - 2gb
        - --maxmemory-policy
        - allkeys-lru
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: personapass-secrets
              key: REDIS_PASSWORD
        ports:
        - containerPort: 6379
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 4Gi
        livenessProbe:
          exec:
            command:
            - redis-cli
            - --no-auth-warning
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - --no-auth-warning
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: personapass-redis
  namespace: personapass
spec:
  selector:
    app: personapass-redis
  ports:
  - port: 6379
    targetPort: 6379
```

#### Application Deployment
```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personapass-api
  namespace: personapass
  labels:
    app: personapass-api
    version: v1.0.0
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: personapass-api
  template:
    metadata:
      labels:
        app: personapass-api
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: personapass-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: api
        image: personapass/api:v1.0.0
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: personapass-config
              key: NODE_ENV
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: personapass-config
              key: LOG_LEVEL
        - name: DATABASE_URL
          value: postgresql://personapass:$(DATABASE_PASSWORD)@personapass-postgres:5432/personapass
        - name: REDIS_URL
          value: redis://:$(REDIS_PASSWORD)@personapass-redis:6379
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: personapass-secrets
              key: DATABASE_PASSWORD
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: personapass-secrets
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: personapass-secrets
              key: JWT_SECRET
        ports:
        - containerPort: 3001
          name: http
        - containerPort: 9090
          name: metrics
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: personapass-api
  namespace: personapass
  labels:
    app: personapass-api
spec:
  selector:
    app: personapass-api
  ports:
  - name: http
    port: 80
    targetPort: 3001
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

#### Wallet PWA Deployment
```yaml
# wallet-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personapass-wallet
  namespace: personapass
spec:
  replicas: 4
  selector:
    matchLabels:
      app: personapass-wallet
  template:
    metadata:
      labels:
        app: personapass-wallet
    spec:
      containers:
      - name: wallet
        image: personapass/wallet:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: personapass-config
              key: API_BASE_URL
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: personapass-wallet
  namespace: personapass
spec:
  selector:
    app: personapass-wallet
  ports:
  - port: 80
    targetPort: 3000
```

#### Ingress Configuration
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: personapass-ingress
  namespace: personapass
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-buffer-size: "16k"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "60s"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://wallet.personapass.id"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
spec:
  tls:
  - hosts:
    - api.personapass.id
    - wallet.personapass.id
    secretName: personapass-tls
  rules:
  - host: api.personapass.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personapass-api
            port:
              number: 80
  - host: wallet.personapass.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personapass-wallet
            port:
              number: 80
```

### 🔄 Helm Chart Deployment

#### Helm Values Configuration
```yaml
# values.yaml
global:
  environment: production
  imageRegistry: docker.io/personapass
  imagePullPolicy: Always
  storageClass: fast-ssd

api:
  replicaCount: 6
  image:
    repository: personapass/api
    tag: v1.0.0
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  autoscaling:
    enabled: true
    minReplicas: 6
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

wallet:
  replicaCount: 4
  image:
    repository: personapass/wallet
    tag: v1.0.0
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi

postgresql:
  enabled: true
  auth:
    database: personapass
    username: personapass
    existingSecret: personapass-secrets
    secretKeys:
      adminPasswordKey: DATABASE_PASSWORD
  primary:
    resources:
      requests:
        cpu: 1000m
        memory: 4Gi
      limits:
        cpu: 2000m
        memory: 8Gi
    persistence:
      enabled: true
      size: 500Gi
      storageClass: fast-ssd

redis:
  enabled: true
  auth:
    enabled: true
    existingSecret: personapass-secrets
    existingSecretPasswordKey: REDIS_PASSWORD
  master:
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 1000m
        memory: 4Gi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.personapass.id
      paths:
        - path: /
          pathType: Prefix
          service: api
    - host: wallet.personapass.id
      paths:
        - path: /
          pathType: Prefix
          service: wallet
  tls:
    - secretName: personapass-tls
      hosts:
        - api.personapass.id
        - wallet.personapass.id

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
  jaeger:
    enabled: true

blockchain:
  enabled: true
  replicaCount: 3
  image:
    repository: personapass/blockchain
    tag: v1.0.0
  persistence:
    enabled: true
    size: 1Ti
    storageClass: fast-ssd
```

#### Helm Installation Commands
```bash
# Add PersonaPass Helm repository
helm repo add personapass https://charts.personapass.id
helm repo update

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create namespace
kubectl create namespace personapass

# Install PersonaPass with custom values
helm install personapass personapass/personapass \
  --namespace personapass \
  --values values.yaml \
  --wait \
  --timeout 10m

# Verify deployment
kubectl get pods -n personapass
kubectl get services -n personapass
kubectl get ingress -n personapass

# Check application logs
kubectl logs -f deployment/personapass-api -n personapass
```

## 🐳 Docker Deployment

### 📦 Docker Compose Production Setup

#### Complete Docker Compose Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Reverse Proxy & Load Balancer
  nginx:
    image: nginx:alpine
    container_name: personapass-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-cache:/var/cache/nginx
    depends_on:
      - api
      - wallet
    restart: unless-stopped
    networks:
      - frontend
      - backend

  # API Service (Multiple Instances)
  api:
    image: personapass/api:v1.0.0
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://personapass:${DATABASE_PASSWORD}@postgres:5432/personapass
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      API_KEY_SECRET: ${API_KEY_SECRET}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
      LOG_LEVEL: info
      ENABLE_METRICS: "true"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - backend
    volumes:
      - api-logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Wallet PWA Service
  wallet:
    image: personapass/wallet:v1.0.0
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    environment:
      API_BASE_URL: https://api.personapass.id
      NODE_ENV: production
    restart: unless-stopped
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: personapass-postgres
    environment:
      POSTGRES_DB: personapass
      POSTGRES_USER: personapass
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U personapass"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: personapass-redis
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 4gb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis-data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # Blockchain Node
  blockchain:
    image: personapass/blockchain:v1.0.0
    container_name: personapass-blockchain
    environment:
      CHAIN_ID: persona-1
      MONIKER: production-node
      GENESIS_FILE: /genesis/genesis.json
    volumes:
      - blockchain-data:/root/.persona-chain
      - ./blockchain/config:/genesis:ro
    ports:
      - "26656:26656"  # P2P
      - "26657:26657"  # RPC
      - "1317:1317"    # REST API
    restart: unless-stopped
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:26657/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: personapass-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: personapass-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-simple-json-datasource
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    ports:
      - "3001:3000"
    restart: unless-stopped
    networks:
      - monitoring
    depends_on:
      - prometheus

  # Log Aggregation
  loki:
    image: grafana/loki:latest
    container_name: personapass-loki
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./monitoring/loki.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    ports:
      - "3100:3100"
    restart: unless-stopped
    networks:
      - monitoring

  promtail:
    image: grafana/promtail:latest
    container_name: personapass-promtail
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./monitoring/promtail.yml:/etc/promtail/config.yml:ro
      - api-logs:/var/log/api:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    restart: unless-stopped
    networks:
      - monitoring
    depends_on:
      - loki

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  blockchain-data:
    driver: local
  prometheus-data:
    driver: local
  grafana-data:
    driver: local
  loki-data:
    driver: local
  api-logs:
    driver: local
  nginx-cache:
    driver: local

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
  monitoring:
    driver: bridge
```

#### Environment Configuration
```bash
# .env.prod
# Database
DATABASE_PASSWORD=super_secure_db_password_here
POSTGRES_DB=personapass
POSTGRES_USER=personapass

# Redis
REDIS_PASSWORD=super_secure_redis_password_here

# Application Secrets
JWT_SECRET=super_secure_jwt_secret_256_bits_minimum
API_KEY_SECRET=super_secure_api_key_secret_here
WEBHOOK_SECRET=super_secure_webhook_secret_here

# Monitoring
GRAFANA_PASSWORD=super_secure_grafana_password_here

# SSL/TLS
SSL_CERT_PATH=/etc/nginx/ssl/personapass.crt
SSL_KEY_PATH=/etc/nginx/ssl/personapass.key

# Blockchain
CHAIN_ID=persona-1
VALIDATOR_MNEMONIC=word1 word2 word3 ... word24
```

#### Nginx Configuration
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=wallet:10m rate=5r/s;

    # Upstream servers
    upstream api_backend {
        least_conn;
        server api:3001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream wallet_backend {
        least_conn;
        server wallet:3000 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    # API Server
    server {
        listen 443 ssl http2;
        server_name api.personapass.id;

        ssl_certificate /etc/nginx/ssl/personapass.crt;
        ssl_certificate_key /etc/nginx/ssl/personapass.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        location / {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Keep-alive
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }

        location /health {
            access_log off;
            proxy_pass http://api_backend;
        }
    }

    # Wallet Server
    server {
        listen 443 ssl http2;
        server_name wallet.personapass.id;

        ssl_certificate /etc/nginx/ssl/personapass.crt;
        ssl_certificate_key /etc/nginx/ssl/personapass.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;

        # Rate limiting
        limit_req zone=wallet burst=10 nodelay;

        location / {
            proxy_pass http://wallet_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://wallet_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.personapass.id wallet.personapass.id;
        return 301 https://$server_name$request_uri;
    }
}
```

#### Deployment Scripts
```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "🚀 Starting PersonaPass production deployment..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed"
    exit 1
fi

# Load environment variables
if [ -f .env.prod ]; then
    source .env.prod
else
    echo "❌ .env.prod file not found"
    exit 1
fi

# Create necessary directories
mkdir -p nginx/ssl postgres/init redis monitoring/grafana/provisioning blockchain/config

# Generate SSL certificates (if not exists)
if [ ! -f nginx/ssl/personapass.crt ]; then
    echo "🔒 Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/personapass.key \
        -out nginx/ssl/personapass.crt \
        -subj "/C=US/ST=State/L=City/O=PersonaPass/OU=IT/CN=personapass.id"
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Start services
echo "🏗️ Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
docker-compose -f docker-compose.prod.yml exec api curl -f http://localhost:3001/health || sleep 30

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec api npm run migrate

# Verify deployment
echo "✅ Verifying deployment..."
curl -f https://api.personapass.id/health
curl -f https://wallet.personapass.id/

echo "🎉 Deployment completed successfully!"
echo "📊 Monitor at: http://localhost:3001 (Grafana)"
echo "📈 Metrics at: http://localhost:9090 (Prometheus)"
```

## ☁️ Cloud Provider Guides

### 🔥 AWS Deployment

#### EKS Cluster Setup
```bash
#!/bin/bash
# aws-eks-setup.sh

# Create EKS cluster
eksctl create cluster \
    --name personapass-prod \
    --version 1.28 \
    --region us-west-2 \
    --nodegroup-name workers \
    --node-type m5.xlarge \
    --nodes 6 \
    --nodes-min 3 \
    --nodes-max 12 \
    --managed \
    --enable-ssm \
    --asg-access \
    --external-dns-access \
    --full-ecr-access \
    --appmesh-access \
    --alb-ingress-access

# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    --set clusterName=personapass-prod \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    -n kube-system

# Install EBS CSI Driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.24"

# Install EFS CSI Driver for shared storage
kubectl apply -k "github.com/kubernetes-sigs/aws-efs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.5"
```

#### AWS-Specific Configurations
```yaml
# aws-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: personapass-ingress
  namespace: personapass
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS-1-2-2017-01
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-port: traffic-port
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/success-codes: "200"
spec:
  rules:
  - host: api.personapass.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personapass-api
            port:
              number: 80
  - host: wallet.personapass.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personapass-wallet
            port:
              number: 80
```

### 🔵 Azure Deployment

#### AKS Cluster Setup
```bash
#!/bin/bash
# azure-aks-setup.sh

# Create resource group
az group create --name personapass-prod --location eastus

# Create AKS cluster
az aks create \
    --resource-group personapass-prod \
    --name personapass-aks \
    --node-count 6 \
    --node-vm-size Standard_D4s_v3 \
    --enable-addons monitoring \
    --enable-msi-auth-for-monitoring \
    --generate-ssh-keys \
    --kubernetes-version 1.28.0 \
    --enable-cluster-autoscaler \
    --min-count 3 \
    --max-count 12

# Get credentials
az aks get-credentials --resource-group personapass-prod --name personapass-aks

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 🔴 Google Cloud Deployment

#### GKE Cluster Setup
```bash
#!/bin/bash
# gcp-gke-setup.sh

# Create GKE cluster
gcloud container clusters create personapass-prod \
    --zone us-central1-a \
    --machine-type e2-standard-4 \
    --num-nodes 6 \
    --enable-autoscaling \
    --min-nodes 3 \
    --max-nodes 12 \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-ip-alias \
    --enable-network-policy \
    --cluster-version 1.28

# Get credentials
gcloud container clusters get-credentials personapass-prod --zone us-central1-a

# Install GKE Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-gce/master/deploy/gce-ingress-controller.yaml
```

## 🔒 Security Configuration

### 🛡️ Network Security

#### Network Policies
```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: personapass-network-policy
  namespace: personapass
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow ingress from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  # Allow internal communication
  - from:
    - namespaceSelector:
        matchLabels:
          name: personapass
  egress:
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
  # Allow HTTPS outbound
  - to: []
    ports:
    - protocol: TCP
      port: 443
  # Allow internal communication
  - to:
    - namespaceSelector:
        matchLabels:
          name: personapass
```

#### Pod Security Standards
```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: personapass-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### 🔐 RBAC Configuration

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: personapass-api
  namespace: personapass
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: personapass
  name: personapass-api-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: personapass-api-rolebinding
  namespace: personapass
subjects:
- kind: ServiceAccount
  name: personapass-api
  namespace: personapass
roleRef:
  kind: Role
  name: personapass-api-role
  apiGroup: rbac.authorization.k8s.io
```

---

<div align="center">

**🚀 Deploy with confidence, scale with ease**

[📖 Back to Documentation](README.md) | [📊 Monitoring Guide](MONITORING.md) | [🆘 Operations Guide](OPERATIONS.md)

*Production-ready deployment for the future of digital identity* ⚡

</div>