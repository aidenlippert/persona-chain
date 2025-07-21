#!/bin/bash

# PersonaPass Kubernetes-Native Health Check Script
# Comprehensive health validation for PersonaPass platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
NAMESPACE=${NAMESPACE:-personapass}
TIMEOUT=${TIMEOUT:-300}
VERBOSE=${VERBOSE:-false}

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_CHECKS++))
}

log_check() {
    local check_name="$1"
    ((TOTAL_CHECKS++))
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Running check: $check_name"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check cluster connection
check_cluster_connection() {
    log_check "Cluster Connection"
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    local cluster_name
    cluster_name=$(kubectl config current-context)
    log_success "Connected to cluster: $cluster_name"
}

# Function to check namespace existence
check_namespace() {
    log_check "Namespace Existence"
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        return 1
    fi
    
    log_success "Namespace '$NAMESPACE' exists"
}

# Function to check core infrastructure components
check_infrastructure() {
    log_info "Checking infrastructure components..."
    
    # Check cert-manager
    log_check "cert-manager"
    if kubectl get deployment cert-manager -n cert-manager &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "cert-manager is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "cert-manager is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_error "cert-manager deployment not found"
    fi
    
    # Check Istio
    log_check "Istio Control Plane"
    if kubectl get deployment istiod -n istio-system &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment istiod -n istio-system -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment istiod -n istio-system -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "Istio control plane is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "Istio control plane is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_error "Istio control plane deployment not found"
    fi
    
    # Check KEDA
    log_check "KEDA Operator"
    if kubectl get deployment keda-operator -n keda &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment keda-operator -n keda -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment keda-operator -n keda -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "KEDA operator is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "KEDA operator is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_error "KEDA operator deployment not found"
    fi
    
    # Check Prometheus
    log_check "Prometheus"
    if kubectl get deployment prometheus-server -n monitoring &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment prometheus-server -n monitoring -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment prometheus-server -n monitoring -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "Prometheus is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "Prometheus is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_warn "Prometheus deployment not found (may use Helm deployment)"
    fi
    
    # Check Grafana
    log_check "Grafana"
    if kubectl get deployment prometheus-grafana -n monitoring &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment prometheus-grafana -n monitoring -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment prometheus-grafana -n monitoring -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "Grafana is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "Grafana is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_warn "Grafana deployment not found (may use different name)"
    fi
    
    # Check Jaeger
    log_check "Jaeger"
    if kubectl get deployment jaeger -n monitoring &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get deployment jaeger -n monitoring -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get deployment jaeger -n monitoring -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            log_success "Jaeger is healthy ($ready_replicas/$desired_replicas replicas)"
        else
            log_error "Jaeger is unhealthy ($ready_replicas/$desired_replicas replicas)"
        fi
    else
        log_warn "Jaeger deployment not found"
    fi
}

# Function to check PersonaPass applications
check_applications() {
    log_info "Checking PersonaPass applications..."
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        log_check "PersonaPass $service"
        
        if kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            local ready_replicas
            ready_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired_replicas
            desired_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready_replicas" == "$desired_replicas" && "$ready_replicas" -gt 0 ]]; then
                log_success "$service is healthy ($ready_replicas/$desired_replicas replicas)"
                
                # Check service endpoints
                local endpoints
                endpoints=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
                if [[ "$endpoints" -gt 0 ]]; then
                    log_success "$service has $endpoints healthy endpoints"
                else
                    log_warn "$service has no healthy endpoints"
                fi
            else
                log_error "$service is unhealthy ($ready_replicas/$desired_replicas replicas)"
            fi
        else
            log_warn "$service deployment not found"
        fi
    done
}

# Function to check network connectivity
check_network() {
    log_info "Checking network connectivity..."
    
    # Check Istio injection
    log_check "Istio Injection"
    local istio_label
    istio_label=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null || echo "")
    if [[ "$istio_label" == "enabled" ]]; then
        log_success "Istio injection is enabled for namespace $NAMESPACE"
    else
        log_warn "Istio injection is not enabled for namespace $NAMESPACE"
    fi
    
    # Check virtual services
    log_check "Istio Virtual Services"
    local vs_count
    vs_count=$(kubectl get virtualservices -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$vs_count" -gt 0 ]]; then
        log_success "Found $vs_count Istio virtual services"
    else
        log_warn "No Istio virtual services found"
    fi
    
    # Check destination rules
    log_check "Istio Destination Rules"
    local dr_count
    dr_count=$(kubectl get destinationrules -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$dr_count" -gt 0 ]]; then
        log_success "Found $dr_count Istio destination rules"
    else
        log_warn "No Istio destination rules found"
    fi
    
    # Check network policies
    log_check "Network Policies"
    local np_count
    np_count=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$np_count" -gt 0 ]]; then
        log_success "Found $np_count network policies"
    else
        log_warn "No network policies found"
    fi
}

# Function to check auto-scaling
check_autoscaling() {
    log_info "Checking auto-scaling configuration..."
    
    # Check KEDA scaled objects
    log_check "KEDA Scaled Objects"
    local so_count
    so_count=$(kubectl get scaledobjects -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$so_count" -gt 0 ]]; then
        log_success "Found $so_count KEDA scaled objects"
        
        # Check if any are active
        local active_count
        active_count=$(kubectl get scaledobjects -n "$NAMESPACE" -o jsonpath='{.items[?(@.status.conditions[0].status=="True")].metadata.name}' 2>/dev/null | wc -w)
        if [[ "$active_count" -gt 0 ]]; then
            log_success "$active_count KEDA scaled objects are active"
        else
            log_warn "No KEDA scaled objects are currently active"
        fi
    else
        log_warn "No KEDA scaled objects found"
    fi
    
    # Check horizontal pod autoscalers
    log_check "Horizontal Pod Autoscalers"
    local hpa_count
    hpa_count=$(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$hpa_count" -gt 0 ]]; then
        log_success "Found $hpa_count horizontal pod autoscalers"
    else
        log_warn "No horizontal pod autoscalers found"
    fi
}

# Function to check storage
check_storage() {
    log_info "Checking storage configuration..."
    
    # Check persistent volume claims
    log_check "Persistent Volume Claims"
    local pvc_count
    pvc_count=$(kubectl get pvc -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$pvc_count" -gt 0 ]]; then
        log_success "Found $pvc_count persistent volume claims"
        
        # Check if all are bound
        local bound_count
        bound_count=$(kubectl get pvc -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Bound" || echo "0")
        if [[ "$bound_count" == "$pvc_count" ]]; then
            log_success "All $pvc_count PVCs are bound"
        else
            log_error "Only $bound_count out of $pvc_count PVCs are bound"
        fi
    else
        log_warn "No persistent volume claims found"
    fi
    
    # Check storage usage
    log_check "Storage Usage"
    if command_exists kubectl && kubectl top pods -n "$NAMESPACE" --containers 2>/dev/null | grep -q .; then
        log_success "Storage metrics are available"
    else
        log_warn "Storage metrics not available (metrics-server may not be installed)"
    fi
}

# Function to check security
check_security() {
    log_info "Checking security configuration..."
    
    # Check RBAC
    log_check "RBAC Configuration"
    local sa_count
    sa_count=$(kubectl get serviceaccounts -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$sa_count" -gt 1 ]]; then  # More than default service account
        log_success "Found $sa_count service accounts (including custom accounts)"
    else
        log_warn "Only default service account found"
    fi
    
    # Check pod security standards
    log_check "Pod Security Standards"
    local pods_with_security_context
    pods_with_security_context=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[?(@.spec.securityContext.runAsNonRoot==true)].metadata.name}' 2>/dev/null | wc -w)
    local total_pods
    total_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ "$total_pods" -gt 0 ]]; then
        if [[ "$pods_with_security_context" -gt 0 ]]; then
            log_success "$pods_with_security_context out of $total_pods pods have security context configured"
        else
            log_warn "No pods have security context configured"
        fi
    else
        log_warn "No pods found to check security context"
    fi
    
    # Check network policies
    log_check "Security Policies"
    local policy_count
    policy_count=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$policy_count" -gt 0 ]]; then
        log_success "Found $policy_count network policies"
    else
        log_warn "No network policies found"
    fi
}

# Function to check monitoring
check_monitoring() {
    log_info "Checking monitoring configuration..."
    
    # Check if services have monitoring annotations
    log_check "Service Monitoring Annotations"
    local monitored_services
    monitored_services=$(kubectl get services -n "$NAMESPACE" -o jsonpath='{.items[?(@.metadata.annotations.prometheus\.io/scrape=="true")].metadata.name}' 2>/dev/null | wc -w)
    local total_services
    total_services=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ "$total_services" -gt 0 ]]; then
        if [[ "$monitored_services" -gt 0 ]]; then
            log_success "$monitored_services out of $total_services services have monitoring enabled"
        else
            log_warn "No services have monitoring annotations"
        fi
    else
        log_warn "No services found"
    fi
    
    # Check ServiceMonitors
    log_check "ServiceMonitors"
    local sm_count
    sm_count=$(kubectl get servicemonitors -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$sm_count" -gt 0 ]]; then
        log_success "Found $sm_count ServiceMonitors"
    else
        log_warn "No ServiceMonitors found"
    fi
    
    # Check PrometheusRules
    log_check "Prometheus Rules"
    local pr_count
    pr_count=$(kubectl get prometheusrules -n monitoring --no-headers 2>/dev/null | grep -c "personapass" || echo "0")
    if [[ "$pr_count" -gt 0 ]]; then
        log_success "Found $pr_count PersonaPass Prometheus rules"
    else
        log_warn "No PersonaPass Prometheus rules found"
    fi
}

# Function to run health check endpoints
check_health_endpoints() {
    log_info "Checking application health endpoints..."
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        log_check "$service Health Endpoint"
        
        if kubectl get service "$service" -n "$NAMESPACE" &> /dev/null; then
            # Port forward and check health endpoint
            local port
            port=$(kubectl get service "$service" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)
            
            if [[ -n "$port" ]]; then
                # Try to check if the service responds (simplified check)
                if kubectl exec -n "$NAMESPACE" deployment/"$service" -- wget -q --spider http://localhost:"$port"/health 2>/dev/null; then
                    log_success "$service health endpoint is responding"
                else
                    log_warn "$service health endpoint check failed or not available"
                fi
            else
                log_warn "Cannot determine port for $service"
            fi
        else
            log_warn "$service service not found"
        fi
    done
}

# Function to check ingress
check_ingress() {
    log_info "Checking ingress configuration..."
    
    # Check ingress resources
    log_check "Ingress Resources"
    local ingress_count
    ingress_count=$(kubectl get ingress -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$ingress_count" -gt 0 ]]; then
        log_success "Found $ingress_count ingress resources"
        
        # Check if ingresses have addresses
        local ingresses_with_address
        ingresses_with_address=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[?(@.status.loadBalancer.ingress[0].ip)].metadata.name}' 2>/dev/null | wc -w)
        if [[ "$ingresses_with_address" -gt 0 ]]; then
            log_success "$ingresses_with_address ingresses have external addresses"
        else
            log_warn "No ingresses have external addresses assigned"
        fi
    else
        log_warn "No ingress resources found"
    fi
    
    # Check TLS certificates
    log_check "TLS Certificates"
    local cert_count
    cert_count=$(kubectl get certificates -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [[ "$cert_count" -gt 0 ]]; then
        log_success "Found $cert_count TLS certificates"
        
        # Check if certificates are ready
        local ready_certs
        ready_certs=$(kubectl get certificates -n "$NAMESPACE" -o jsonpath='{.items[?(@.status.conditions[0].status=="True")].metadata.name}' 2>/dev/null | wc -w)
        if [[ "$ready_certs" -gt 0 ]]; then
            log_success "$ready_certs certificates are ready"
        else
            log_warn "No certificates are ready"
        fi
    else
        log_warn "No TLS certificates found"
    fi
}

# Function to display summary
display_summary() {
    echo ""
    log_info "Health Check Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "📊 ${BLUE}Total Checks:${NC} $TOTAL_CHECKS"
    echo -e "✅ ${GREEN}Passed:${NC} $PASSED_CHECKS"
    echo -e "⚠️  ${YELLOW}Warnings:${NC} $WARNING_CHECKS"
    echo -e "❌ ${RED}Failed:${NC} $FAILED_CHECKS"
    echo ""
    
    local success_rate
    if [[ "$TOTAL_CHECKS" -gt 0 ]]; then
        success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
        echo -e "📈 ${BLUE}Success Rate:${NC} ${success_rate}%"
    fi
    
    echo ""
    
    if [[ "$FAILED_CHECKS" -eq 0 ]]; then
        if [[ "$WARNING_CHECKS" -eq 0 ]]; then
            log_success "All health checks passed! PersonaPass platform is fully operational 🚀"
        else
            log_warn "Health checks passed with warnings. Platform is operational but may need attention 🔧"
        fi
    else
        log_error "Some health checks failed. Platform may not be fully operational ⚠️"
        echo ""
        echo "Recommended actions:"
        echo "1. Review failed checks above"
        echo "2. Check pod logs: kubectl logs -n $NAMESPACE <pod-name>"
        echo "3. Check events: kubectl get events -n $NAMESPACE"
        echo "4. Review deployment status: kubectl get deployments -n $NAMESPACE"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Comprehensive health check for PersonaPass Kubernetes-Native deployment.

Options:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: personapass)
    -t, --timeout TIMEOUT       Timeout in seconds (default: 300)
    -v, --verbose               Enable verbose output
    -h, --help                  Show this help message

Examples:
    $0                          # Run health checks with defaults
    $0 -n personapass-staging   # Check staging namespace
    $0 -v                       # Run with verbose output
    $0 -t 600                   # Run with 10-minute timeout

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "Starting PersonaPass Kubernetes-Native Health Check"
    log_info "Namespace: $NAMESPACE"
    log_info "Timeout: $TIMEOUT seconds"
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Verbose mode: enabled"
    fi
    echo ""
    
    # Check prerequisites
    if ! command_exists kubectl; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Run health checks
    check_cluster_connection
    check_namespace
    check_infrastructure
    check_applications
    check_network
    check_autoscaling
    check_storage
    check_security
    check_monitoring
    check_health_endpoints
    check_ingress
    
    # Display summary
    display_summary
    
    # Exit with appropriate code
    if [[ "$FAILED_CHECKS" -gt 0 ]]; then
        exit 1
    elif [[ "$WARNING_CHECKS" -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function
main "$@"