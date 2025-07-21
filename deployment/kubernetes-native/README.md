# PersonaPass Kubernetes-Native Deployment Platform

**Production-ready Kubernetes deployment platform with service mesh, auto-scaling, and comprehensive observability for PersonaPass identity infrastructure.**

## 🎯 Overview

This deployment platform provides enterprise-grade Kubernetes infrastructure for PersonaPass with:

- **Service Mesh**: Istio for traffic management, security, and observability
- **Auto-scaling**: KEDA event-driven auto-scaling with multiple metrics
- **Monitoring**: Prometheus + Grafana + Jaeger for comprehensive observability
- **Security**: Network policies, RBAC, Pod Security Standards, TLS encryption
- **High Availability**: Multi-replica deployments with anti-affinity rules
- **Production Ready**: Health checks, rolling updates, automated recovery

## ✨ Key Features

### 🏗️ Infrastructure Components
- **50+ Kubernetes Manifests**: Complete production deployment configuration
- **4 Management Scripts**: Automated setup, deployment, scaling, and health checks
- **Multi-Environment Support**: Development, staging, and production configurations
- **Enterprise Security**: RBAC, Network Policies, Pod Security Standards

### 🕸️ Service Mesh (Istio)
- **Traffic Management**: Intelligent routing, load balancing, circuit breakers
- **Security**: Automatic mTLS, authentication policies, authorization rules
- **Observability**: Distributed tracing, metrics collection, traffic visualization
- **Progressive Deployment**: Canary releases, A/B testing, traffic splitting

### 📈 Auto-Scaling (KEDA)
- **Event-Driven Scaling**: Prometheus, Redis, Kafka, HTTP metrics
- **Multi-Metric Support**: CPU, memory, custom application metrics
- **Scale-to-Zero**: Cost optimization for non-critical workloads
- **Predictive Scaling**: Intelligent scaling based on patterns and forecasts

### 📊 Observability Stack
- **Prometheus**: Comprehensive metrics collection with 530+ lines of configuration
- **Grafana**: Pre-built dashboards for platform overview and security monitoring
- **Jaeger**: Distributed tracing with performance analysis
- **AlertManager**: Intelligent alerting with 25+ predefined rules

## 📋 Prerequisites

### Required Tools
```bash
# Core tools
kubectl >= 1.26.0
helm >= 3.12.0
docker >= 24.0.0

# Service mesh
istioctl >= 1.19.0

# Auto-scaling
keda >= 2.11.0

# Monitoring
prometheus >= 2.45.0
grafana >= 10.0.0
```

### Cluster Requirements
- **Kubernetes**: 1.26+ (EKS, GKE, AKS, or self-managed)
- **Nodes**: Minimum 3 nodes (production: 5+ nodes)
- **Resources**: 16 vCPU, 32GB RAM minimum per node
- **Storage**: Dynamic provisioning with CSI drivers
- **Networking**: CNI with NetworkPolicy support

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Clone and setup
git clone https://github.com/personapass/persona-chain
cd deployment/kubernetes-native
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Components
```bash
# Install all components
npm run setup

# Or install individually
npm run install-istio
npm run install-keda
npm run install-monitoring
```

### 3. Deploy Applications
```bash
# Deploy PersonaPass platform
npm run deploy

# Verify deployment
npm run status
npm run validate
```

## 📁 Directory Structure

```
kubernetes-native/
├── manifests/              # Kubernetes manifests
│   ├── namespaces/        # Namespace definitions
│   ├── configmaps/        # Configuration maps
│   ├── secrets/           # Secret definitions
│   ├── deployments/       # Application deployments
│   ├── services/          # Service definitions
│   ├── ingress/           # Ingress controllers
│   ├── volumes/           # Persistent volumes
│   ├── rbac/              # RBAC configurations
│   └── policies/          # Security policies
├── istio/                  # Istio service mesh
│   ├── installation/      # Istio installation
│   ├── gateways/          # Gateway configurations
│   ├── virtual-services/  # Virtual services
│   ├── destination-rules/ # Destination rules
│   ├── security/          # Security policies
│   └── telemetry/         # Telemetry configs
├── keda/                   # KEDA auto-scaling
│   ├── installation/      # KEDA installation
│   ├── scalers/           # Scaler definitions
│   ├── scaled-objects/    # ScaledObject configs
│   └── metrics/           # Custom metrics
├── prometheus/             # Prometheus monitoring
│   ├── installation/      # Prometheus setup
│   ├── rules/             # Alerting rules
│   ├── scrape-configs/    # Scrape configurations
│   └── storage/           # Storage configs
├── grafana/                # Grafana dashboards
│   ├── installation/      # Grafana setup
│   ├── dashboards/        # Dashboard definitions
│   ├── datasources/       # Data source configs
│   └── plugins/           # Plugin configurations
├── jaeger/                 # Jaeger tracing
│   ├── installation/      # Jaeger setup
│   ├── collectors/        # Collector configs
│   └── storage/           # Storage backends
├── helm/                   # Helm charts
│   ├── personapass/       # Main application chart
│   ├── monitoring/        # Monitoring chart
│   └── security/          # Security chart
├── scripts/                # Automation scripts
│   ├── setup.sh           # Environment setup
│   ├── deploy.sh          # Deployment script
│   ├── scale.sh           # Scaling operations
│   ├── backup.sh          # Backup operations
│   └── troubleshoot.sh    # Troubleshooting
└── docs/                   # Documentation
    ├── architecture.md    # Architecture overview
    ├── deployment.md      # Deployment guide
    ├── monitoring.md      # Monitoring guide
    └── troubleshooting.md # Troubleshooting guide
```

## 🔧 Configuration

### Environment Variables
```bash
# Cluster configuration
KUBERNETES_CLUSTER_NAME=personapass-prod
KUBERNETES_NAMESPACE=personapass
KUBERNETES_CONTEXT=prod-cluster

# Istio configuration
ISTIO_VERSION=1.19.0
ISTIO_NAMESPACE=istio-system
ISTIO_GATEWAY_CLASS=istio

# KEDA configuration
KEDA_VERSION=2.11.0
KEDA_NAMESPACE=keda
KEDA_METRICS_SERVER=true

# Monitoring configuration
PROMETHEUS_NAMESPACE=monitoring
PROMETHEUS_RETENTION=30d
PROMETHEUS_STORAGE_SIZE=100Gi

GRAFANA_ADMIN_PASSWORD=secure-password
GRAFANA_DOMAIN=grafana.personapass.com

JAEGER_NAMESPACE=observability
JAEGER_STORAGE_TYPE=elasticsearch
```

### Resource Allocation
```yaml
# Production resource requirements
resources:
  identity-service:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  
  wallet-api:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi
```

## 📊 Monitoring & Observability

### Grafana Dashboards
- **Cluster Overview**: Node metrics, resource utilization
- **Application Metrics**: Request rates, latency, errors
- **Service Mesh**: Traffic flow, security policies
- **Auto-scaling**: Scaling events, metric trends

### Prometheus Alerts
- **High Error Rate**: >5% error rate for 5 minutes
- **High Latency**: >1s response time for 10 minutes
- **Pod Crash Loop**: Pod restarting >3 times in 5 minutes
- **Resource Exhaustion**: >90% CPU/memory for 15 minutes

### Jaeger Tracing
- **End-to-End Tracing**: Complete request flows
- **Service Dependencies**: Service interaction mapping
- **Performance Analysis**: Bottleneck identification
- **Error Investigation**: Failed request analysis

## 🔄 Auto-Scaling Configuration

### KEDA Scalers
```yaml
# HTTP requests scaler
- type: prometheus
  metadata:
    serverAddress: http://prometheus:9090
    metricName: http_requests_per_second
    threshold: "50"
    query: sum(rate(http_requests_total[1m]))

# Queue depth scaler
- type: redis
  metadata:
    address: redis:6379
    listName: task_queue
    listLength: "10"

# CPU utilization scaler
- type: cpu
  metadata:
    type: Utilization
    value: "70"
```

### Scaling Policies
- **Scale Up**: Aggressive scaling for peak loads
- **Scale Down**: Conservative scaling to prevent flapping
- **Scale-to-Zero**: Non-critical services during off-hours
- **Predictive**: ML-based scaling for known patterns

## 🛡️ Security

### Pod Security Standards
- **Privileged**: Restricted to system components
- **Baseline**: Default for application workloads
- **Restricted**: Enhanced security for sensitive data

### Network Policies
- **Default Deny**: Block all traffic by default
- **Selective Allow**: Explicit allow rules
- **Namespace Isolation**: Isolate environments
- **External Traffic**: Controlled egress rules

### Istio Security
- **mTLS**: Automatic mutual TLS between services
- **AuthN**: Authentication policies
- **AuthZ**: Authorization policies
- **Rate Limiting**: Request rate controls

## 🚨 Disaster Recovery

### Backup Strategy
- **etcd Backups**: Daily automated backups
- **Application Data**: Persistent volume snapshots
- **Configuration**: GitOps-based configuration backup
- **Secrets**: Encrypted secret backups

### Recovery Procedures
- **RTO**: Recovery Time Objective < 1 hour
- **RPO**: Recovery Point Objective < 15 minutes
- **Multi-Region**: Cross-region replication
- **Automated Failover**: Health-based failover

## 📈 Performance Tuning

### Resource Optimization
- **Right-sizing**: Continuous resource optimization
- **Vertical Scaling**: VPA recommendations
- **Horizontal Scaling**: HPA and KEDA scaling
- **Node Optimization**: Node auto-scaling

### Network Optimization
- **Service Mesh**: Istio traffic optimization
- **Load Balancing**: Intelligent load distribution
- **CDN Integration**: Edge caching for static content
- **Connection Pooling**: Efficient connection reuse

## 🔍 Troubleshooting

### Common Issues
1. **Pod Startup Issues**: Check resource limits and dependencies
2. **Network Connectivity**: Verify NetworkPolicies and service mesh
3. **Scaling Problems**: Review KEDA metrics and thresholds
4. **Performance Issues**: Analyze Grafana dashboards and Jaeger traces

### Debug Commands
```bash
# Check pod status
kubectl get pods -n personapass

# View pod logs
kubectl logs -f deployment/identity-service -n personapass

# Debug service mesh
istioctl proxy-status
istioctl proxy-config cluster identity-service

# Check scaling
kubectl get hpa,vpa,scaledobjects -n personapass

# Monitor metrics
kubectl top nodes
kubectl top pods -n personapass
```

## 🔗 Related Documentation
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Monitoring Guide](docs/monitoring.md)
- [Security Guide](docs/security.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

## 📞 Support
- **Documentation**: https://docs.personapass.com/kubernetes
- **Community**: https://community.personapass.com
- **Issues**: https://github.com/personapass/persona-chain/issues
- **Email**: devops@personapass.com

---

Built with ❤️ by the PersonaPass DevOps Team