# PersonaPass Production Monitoring Runbook

## Overview

This runbook provides comprehensive procedures for monitoring, troubleshooting, and maintaining the PersonaPass production environment. It covers the complete monitoring stack deployment and operational procedures for Sprint 8 production readiness validation.

## Table of Contents

1. [Monitoring Stack Architecture](#monitoring-stack-architecture)
2. [Deployment Procedures](#deployment-procedures)
3. [Dashboard Access and Navigation](#dashboard-access-and-navigation)
4. [Alert Response Procedures](#alert-response-procedures)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Response](#emergency-response)

## Monitoring Stack Architecture

### Components Overview

| Component | Purpose | Port | Container Name |
|-----------|---------|------|----------------|
| Prometheus | Metrics collection and storage | 9090 | persona-prometheus |
| Grafana | Metrics visualization and dashboards | 3001 | persona-grafana |
| Alertmanager | Alert routing and notifications | 9093 | persona-alertmanager |
| Node Exporter | System metrics collection | 9100 | persona-node-exporter |
| Blackbox Exporter | External endpoint monitoring | 9115 | persona-blackbox-exporter |
| Redis | Caching layer for performance | 6379 | persona-redis |
| Redis Exporter | Redis metrics collection | 9121 | persona-redis-exporter |

### Monitored PersonaPass Components

- **Blockchain Validators** (ports 8100, 8200, 8300)
- **Full Nodes** (ports 8400, 8500)
- **Load Balancer** (port 8080)
- **Production Frontend** (https://personapass.xyz)
- **DID Module** (/persona/did/v1beta1/*)
- **VC Module** (/persona/vc/v1beta1/*)
- **ZK Module** (/persona/zk/v1beta1/*)

## Deployment Procedures

### Initial Deployment

1. **Prerequisites Check**
   ```bash
   # Verify Docker and Docker Compose are available
   docker --version
   docker-compose --version
   
   # Ensure all configuration files exist
   ls -la /home/rocz/persona-chain/monitoring/
   ```

2. **Deploy Monitoring Stack**
   ```bash
   cd /home/rocz/persona-chain
   
   # Deploy all monitoring services
   docker-compose up -d prometheus grafana alertmanager node-exporter blackbox-exporter redis redis-exporter
   
   # Verify all services are running
   docker-compose ps
   ```

3. **Validate Deployment**
   ```bash
   # Run validation script
   ./scripts/monitoring-validation.sh
   
   # Check service health
   curl -f http://localhost:9090/-/healthy  # Prometheus
   curl -f http://localhost:3001/api/health # Grafana
   curl -f http://localhost:9093/-/healthy  # Alertmanager
   ```

### Service Access Information

- **Grafana Dashboard**: http://localhost:3001
  - Username: `admin`
  - Password: `personapass-admin-2025`
- **Prometheus UI**: http://localhost:9090
- **Alertmanager UI**: http://localhost:9093

## Dashboard Access and Navigation

### Primary Dashboards

#### 1. PersonaPass Production Overview Dashboard
- **Access**: http://localhost:3001/d/personapass-overview
- **Purpose**: High-level system health and performance monitoring
- **Key Metrics**:
  - API response times (95th percentile target: <2s)
  - Request rates and throughput
  - Error rates (target: <2%)
  - Service health status
  - System resource usage (CPU, Memory, Disk)

#### 2. ZK Proof Performance Dashboard
- **Access**: http://localhost:3001/d/personapass-zk-performance
- **Purpose**: Detailed ZK proof generation and verification monitoring
- **Key Metrics**:
  - ZK proof generation latency (95th percentile target: <10s)
  - Proof throughput and queue status
  - Cache hit rates (target: >90%)
  - Resource usage by proof type

### Dashboard Interpretation

#### Normal Operating Ranges

| Metric | Normal Range | Warning Threshold | Critical Threshold |
|--------|--------------|-------------------|-------------------|
| API Response Time (p95) | <500ms | 2s | 5s |
| Error Rate | <1% | 2% | 5% |
| ZK Proof Latency (p95) | <8s | 10s | 20s |
| CPU Usage | <60% | 80% | 90% |
| Memory Usage | <70% | 85% | 95% |
| Disk Usage | <70% | 80% | 90% |

## Alert Response Procedures

### Critical Alerts (Immediate Response Required)

#### ValidatorNodeDown
- **Severity**: Critical
- **Response Time**: Immediate (< 5 minutes)
- **Procedure**:
  1. Check validator status: `docker-compose ps`
  2. Review validator logs: `docker-compose logs validator1`
  3. Attempt restart: `docker-compose restart validator1`
  4. If restart fails, escalate to blockchain team
  5. Monitor consensus performance during recovery

#### FrontendDown
- **Severity**: Critical
- **Response Time**: Immediate (< 2 minutes)
- **Procedure**:
  1. Verify frontend accessibility: `curl -f https://personapass.xyz`
  2. Check CDN status (if using Cloudflare/similar)
  3. Review load balancer logs
  4. Contact hosting provider if infrastructure issue
  5. Activate maintenance page if extended downtime expected

#### CriticalAPIResponseTime
- **Severity**: Critical
- **Response Time**: < 10 minutes
- **Procedure**:
  1. Check system resources: CPU, Memory, Disk usage
  2. Review database performance and connections
  3. Analyze request patterns for unusual load
  4. Consider scaling API instances
  5. Implement temporary rate limiting if necessary

### Warning Alerts (Response Within 30 Minutes)

#### HighAPIResponseTime
- **Procedure**:
  1. Monitor trend - is it improving or degrading?
  2. Check for correlations with increased traffic
  3. Review recent deployments or configuration changes
  4. Plan optimization if sustained high latency

#### HighMemoryUsage / HighCPUUsage
- **Procedure**:
  1. Identify processes consuming resources
  2. Check for memory leaks or runaway processes
  3. Consider scaling if resource usage is legitimate
  4. Plan capacity upgrades if trend continues

### ZK-Specific Alerts

#### ZKProofHighLatency
- **Procedure**:
  1. Check ZK proof queue size and active workers
  2. Verify cache hit rates are optimal
  3. Review proof complexity and size distribution
  4. Consider adding more ZK worker instances
  5. Optimize proof caching strategies

## Troubleshooting Guide

### Common Issues and Solutions

#### High Response Times

**Symptoms**: API response times >2s (95th percentile)

**Investigation Steps**:
1. Check Grafana "PersonaPass Production Overview" dashboard
2. Identify which endpoints are slow
3. Correlate with resource usage metrics
4. Review application logs for errors

**Common Causes & Solutions**:
- **Database bottleneck**: Increase connection pool, add read replicas
- **Cache miss**: Verify Redis is running, check cache hit rates
- **High traffic**: Implement rate limiting, scale API instances
- **Memory pressure**: Increase memory allocation or optimize code

#### Service Discovery Issues

**Symptoms**: Prometheus targets showing as "DOWN"

**Investigation Steps**:
1. Check Prometheus targets: http://localhost:9090/targets
2. Verify service is running: `docker-compose ps`
3. Check network connectivity between containers
4. Review Prometheus configuration

**Solutions**:
- Restart affected service: `docker-compose restart <service_name>`
- Check Docker network: `docker network inspect persona-chain_persona-network`
- Validate Prometheus scrape configuration

#### Alert Fatigue

**Symptoms**: Too many alerts, important alerts missed

**Solutions**:
1. Review alert thresholds - are they too sensitive?
2. Implement alert grouping in Alertmanager
3. Add alert inhibition rules for related alerts
4. Create escalation policies for different severity levels

### Log Analysis

#### Key Log Locations
```bash
# Application logs
docker-compose logs persona-testnet
docker-compose logs faucet
docker-compose logs explorer

# Monitoring logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs alertmanager

# System logs
journalctl -u docker
```

#### Important Log Patterns to Monitor
- `ERROR` or `FATAL` level messages
- Database connection failures
- Memory allocation errors
- Timeout errors in ZK proof generation
- Authentication failures (potential security issues)

## Maintenance Procedures

### Daily Checks

1. **Dashboard Review** (5 minutes)
   - Check main overview dashboard for anomalies
   - Verify all services are healthy (green status)
   - Review overnight alerts

2. **Performance Baseline** (10 minutes)
   - Note current response time baselines
   - Check resource utilization trends
   - Verify ZK proof performance is within normal ranges

### Weekly Maintenance

1. **Capacity Planning Review** (30 minutes)
   - Analyze growth trends in request volume
   - Review resource usage patterns
   - Plan scaling if trends indicate need

2. **Alert Tuning** (20 minutes)
   - Review alert firing frequency
   - Adjust thresholds if necessary
   - Update runbook with new findings

3. **Security Review** (15 minutes)
   - Check for unusual access patterns
   - Review authentication failure rates
   - Verify TLS certificate expiration dates

### Monthly Maintenance

1. **Data Retention Management**
   ```bash
   # Check Prometheus storage usage
   du -sh /var/lib/docker/volumes/persona-chain_prometheus_data
   
   # Clean old data if needed (adjust retention in prometheus.yml)
   ```

2. **Configuration Backup**
   ```bash
   # Backup monitoring configurations
   tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz monitoring/
   ```

3. **Performance Optimization Review**
   - Analyze slowest queries and endpoints
   - Review caching effectiveness
   - Plan infrastructure optimizations

## Emergency Response

### Incident Severity Levels

#### Severity 1: Production Down
- **Definition**: Complete service outage, users cannot access PersonaPass
- **Response Time**: Immediate
- **Escalation**: CEO, CTO, entire engineering team
- **Communication**: Status page update within 5 minutes

#### Severity 2: Degraded Performance
- **Definition**: Service accessible but significantly impaired
- **Response Time**: Within 15 minutes
- **Escalation**: Engineering manager, on-call team
- **Communication**: Internal notification, user communication if >1 hour

#### Severity 3: Minor Issues
- **Definition**: Minor functionality impaired, workarounds available
- **Response Time**: Within 1 hour
- **Escalation**: Primary on-call engineer
- **Communication**: Internal tracking only

### Emergency Contacts

```
Primary On-Call: ops-team@personapass.xyz
Secondary On-Call: dev-team@personapass.xyz
Engineering Manager: engineering@personapass.xyz
Infrastructure Team: infrastructure@personapass.xyz

Slack Channels:
- #alerts-critical (Severity 1 & 2)
- #alerts-warning (Severity 3)
- #ops-team (General operational issues)
```

### Communication Templates

#### Initial Incident Response
```
🚨 INCIDENT ALERT 🚨
Severity: [1/2/3]
Component: [Affected component]
Impact: [Description of user impact]
Response: [Actions being taken]
ETA: [Estimated resolution time]
Updates: Will provide updates every 30 minutes
```

#### Resolution Notification
```
✅ INCIDENT RESOLVED ✅
Duration: [Total incident duration]
Cause: [Root cause summary]
Resolution: [What fixed it]
Next Steps: [Post-incident review planned]
```

## Performance Baselines

### Established Performance Targets (Based on Load Testing)

| Metric | Target | Current Baseline | Notes |
|--------|--------|------------------|-------|
| API Response Time (p95) | <2s | 18.61ms | Excellent performance |
| API Response Time (p50) | <500ms | 11.37ms | Excellent performance |
| Error Rate | <1% | 0% | Perfect reliability |
| ZK Proof Generation (p95) | <10s | 8.164s | Within acceptable range |
| Frontend Load Time | <3s | 1.175s | Excellent performance |
| Cache Hit Rate | >90% | TBD | Monitor after Redis deployment |

### Load Testing Results Reference

Based on Sprint 8 load testing with 500 concurrent users:
- **Total Requests**: 45,211 over 8 minutes
- **HTTP Success Rate**: 100%
- **Simulation Success Rate**: 80.26%
- **Peak Throughput**: 96.1 requests/second

## Security Monitoring

### Security Metrics to Monitor

1. **Authentication Failures**
   - Alert threshold: >50 failures/5 minutes
   - Indicates potential brute force attacks

2. **Unusual Request Patterns**
   - Monitor for request rates >1000 req/sec
   - Check for suspicious user agents

3. **TLS Certificate Status**
   - Monitor certificate expiration dates
   - Alert 7 days before expiration

4. **Access Pattern Analysis**
   - Monitor for unusual geographic access patterns
   - Flag rapid sequential requests from single IPs

### Compliance Requirements

- **Data Retention**: Logs retained for 90 days minimum
- **Audit Trail**: All configuration changes logged
- **Access Control**: Monitoring system access restricted to authorized personnel
- **Encryption**: All metrics transmission encrypted in transit

## Conclusion

This runbook provides the foundation for reliable PersonaPass production monitoring. Regular review and updates ensure it remains current with system evolution and operational learnings.

**Last Updated**: 2025-07-14  
**Next Review Due**: 2025-08-14  
**Maintained By**: PersonaPass Operations Team