#!/bin/bash

# PersonaPass Kubernetes-Native Scaling Script
# Handles manual and automatic scaling of PersonaPass services

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
ACTION=""
SERVICE=""
REPLICAS=""

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check cluster connection
check_cluster_connection() {
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist."
        exit 1
    fi
}

# Function to get available services
get_available_services() {
    kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}'
}

# Function to scale a specific service
scale_service() {
    local service="$1"
    local replicas="$2"
    
    log_info "Scaling $service to $replicas replicas..."
    
    # Check if deployment exists
    if ! kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
        log_error "Deployment '$service' not found in namespace '$NAMESPACE'"
        return 1
    fi
    
    # Scale the deployment
    kubectl scale deployment "$service" --replicas="$replicas" -n "$NAMESPACE"
    
    # Wait for rollout to complete
    log_info "Waiting for scaling to complete..."
    kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s
    
    # Show current status
    local current_replicas
    current_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    log_success "Service $service scaled successfully to $current_replicas replicas"
}

# Function to scale all services
scale_all_services() {
    local replicas="$1"
    
    log_info "Scaling all services to $replicas replicas..."
    
    local services
    services=($(get_available_services))
    
    for service in "${services[@]}"; do
        if [[ -n "$service" ]]; then
            scale_service "$service" "$replicas"
        fi
    done
    
    log_success "All services scaled successfully"
}

# Function to enable auto-scaling
enable_autoscaling() {
    local service="$1"
    local min_replicas="${2:-2}"
    local max_replicas="${3:-10}"
    local cpu_target="${4:-70}"
    
    log_info "Enabling auto-scaling for $service (min: $min_replicas, max: $max_replicas, CPU: $cpu_target%)"
    
    # Check if HPA already exists
    if kubectl get hpa "$service" -n "$NAMESPACE" &> /dev/null; then
        log_warn "HPA already exists for $service, updating..."
        kubectl delete hpa "$service" -n "$NAMESPACE"
    fi
    
    # Create HPA
    kubectl autoscale deployment "$service" \
        --min="$min_replicas" \
        --max="$max_replicas" \
        --cpu-percent="$cpu_target" \
        -n "$NAMESPACE"
    
    log_success "Auto-scaling enabled for $service"
}

# Function to disable auto-scaling
disable_autoscaling() {
    local service="$1"
    
    log_info "Disabling auto-scaling for $service..."
    
    if kubectl get hpa "$service" -n "$NAMESPACE" &> /dev/null; then
        kubectl delete hpa "$service" -n "$NAMESPACE"
        log_success "Auto-scaling disabled for $service"
    else
        log_warn "No HPA found for $service"
    fi
}

# Function to show scaling status
show_scaling_status() {
    log_info "Current Scaling Status:"
    echo ""
    
    # Show deployments with current replicas
    echo "📦 Deployments:"
    kubectl get deployments -n "$NAMESPACE" -o custom-columns=\
"NAME:.metadata.name,DESIRED:.spec.replicas,CURRENT:.status.replicas,READY:.status.readyReplicas,UP-TO-DATE:.status.updatedReplicas,AVAILABLE:.status.availableReplicas,AGE:.metadata.creationTimestamp"
    echo ""
    
    # Show HPAs
    echo "📈 Horizontal Pod Autoscalers:"
    if kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null | grep -q .; then
        kubectl get hpa -n "$NAMESPACE" -o custom-columns=\
"NAME:.metadata.name,REFERENCE:.spec.scaleTargetRef.name,TARGETS:.status.currentCPUUtilizationPercentage,MINPODS:.spec.minReplicas,MAXPODS:.spec.maxReplicas,REPLICAS:.status.currentReplicas,AGE:.metadata.creationTimestamp"
    else
        echo "No HPAs found"
    fi
    echo ""
    
    # Show KEDA ScaledObjects
    echo "🎯 KEDA ScaledObjects:"
    if kubectl get scaledobjects -n "$NAMESPACE" --no-headers 2>/dev/null | grep -q .; then
        kubectl get scaledobjects -n "$NAMESPACE" -o custom-columns=\
"NAME:.metadata.name,SCALETARGET:.spec.scaleTargetRef.name,MIN:.spec.minReplicaCount,MAX:.spec.maxReplicaCount,TRIGGERS:.spec.triggers[*].type,AGE:.metadata.creationTimestamp"
    else
        echo "No KEDA ScaledObjects found"
    fi
    echo ""
    
    # Show resource usage if metrics-server is available
    echo "📊 Resource Usage:"
    if kubectl top pods -n "$NAMESPACE" --containers 2>/dev/null; then
        echo ""
    else
        echo "Metrics server not available or no pods found"
        echo ""
    fi
}

# Function to apply load test scaling
apply_load_test_scaling() {
    log_info "Applying load test scaling configuration..."
    
    local services=(
        "identity-service:5"
        "wallet-api:3"
        "zk-proof-service:2"
        "document-verification:2"
        "multi-tenant-platform:3"
        "hsm-enterprise:2"
    )
    
    for service_config in "${services[@]}"; do
        local service="${service_config%:*}"
        local replicas="${service_config#*:}"
        
        if kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            scale_service "$service" "$replicas"
        else
            log_warn "Service $service not found, skipping..."
        fi
    done
    
    log_success "Load test scaling configuration applied"
}

# Function to apply production scaling
apply_production_scaling() {
    log_info "Applying production scaling configuration..."
    
    local services=(
        "identity-service:3"
        "wallet-api:3"
        "zk-proof-service:2"
        "document-verification:2"
        "multi-tenant-platform:2"
        "hsm-enterprise:2"
    )
    
    for service_config in "${services[@]}"; do
        local service="${service_config%:*}"
        local replicas="${service_config#*:}"
        
        if kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            scale_service "$service" "$replicas"
        else
            log_warn "Service $service not found, skipping..."
        fi
    done
    
    log_success "Production scaling configuration applied"
}

# Function to apply development scaling
apply_development_scaling() {
    log_info "Applying development scaling configuration..."
    
    local services=(
        "identity-service:1"
        "wallet-api:1"
        "zk-proof-service:1"
        "document-verification:1"
        "multi-tenant-platform:1"
        "hsm-enterprise:1"
    )
    
    for service_config in "${services[@]}"; do
        local service="${service_config%:*}"
        local replicas="${service_config#*:}"
        
        if kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            scale_service "$service" "$replicas"
        else
            log_warn "Service $service not found, skipping..."
        fi
    done
    
    log_success "Development scaling configuration applied"
}

# Function to scale down for maintenance
scale_down_maintenance() {
    log_info "Scaling down for maintenance..."
    
    # Scale all services to 0 except critical ones
    local services
    services=($(get_available_services))
    
    local critical_services=("identity-service")
    
    for service in "${services[@]}"; do
        if [[ -n "$service" ]]; then
            if [[ " ${critical_services[@]} " =~ " ${service} " ]]; then
                scale_service "$service" "1"
                log_info "Keeping $service at minimum for critical operations"
            else
                scale_service "$service" "0"
                log_info "Scaled down $service for maintenance"
            fi
        fi
    done
    
    log_success "Maintenance scaling completed"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [ACTION] [OPTIONS]

Scale PersonaPass services in Kubernetes.

Actions:
    status                      Show current scaling status
    scale SERVICE REPLICAS      Scale specific service to number of replicas
    scale-all REPLICAS          Scale all services to number of replicas
    auto-enable SERVICE [MIN] [MAX] [CPU]  Enable auto-scaling for service
    auto-disable SERVICE        Disable auto-scaling for service
    load-test                   Apply load test scaling configuration
    production                  Apply production scaling configuration
    development                 Apply development scaling configuration
    maintenance                 Scale down for maintenance

Options:
    -n, --namespace NAMESPACE   Kubernetes namespace (default: personapass)
    -h, --help                  Show this help message

Examples:
    $0 status                           # Show scaling status
    $0 scale identity-service 5         # Scale identity service to 5 replicas
    $0 scale-all 3                      # Scale all services to 3 replicas
    $0 auto-enable wallet-api 2 10 80   # Enable auto-scaling (min=2, max=10, cpu=80%)
    $0 load-test                        # Apply load test configuration
    $0 production                       # Apply production configuration

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        status)
            ACTION="status"
            shift
            ;;
        scale)
            ACTION="scale"
            SERVICE="$2"
            REPLICAS="$3"
            shift 3
            ;;
        scale-all)
            ACTION="scale-all"
            REPLICAS="$2"
            shift 2
            ;;
        auto-enable)
            ACTION="auto-enable"
            SERVICE="$2"
            MIN_REPLICAS="${3:-2}"
            MAX_REPLICAS="${4:-10}"
            CPU_TARGET="${5:-70}"
            shift 2
            [[ $# -gt 0 ]] && shift
            [[ $# -gt 0 ]] && shift
            [[ $# -gt 0 ]] && shift
            ;;
        auto-disable)
            ACTION="auto-disable"
            SERVICE="$2"
            shift 2
            ;;
        load-test)
            ACTION="load-test"
            shift
            ;;
        production)
            ACTION="production"
            shift
            ;;
        development)
            ACTION="development"
            shift
            ;;
        maintenance)
            ACTION="maintenance"
            shift
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
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

# Validate required parameters
if [[ -z "$ACTION" ]]; then
    log_error "No action specified"
    show_usage
    exit 1
fi

if [[ "$ACTION" == "scale" && (-z "$SERVICE" || -z "$REPLICAS") ]]; then
    log_error "Service and replicas required for scale action"
    show_usage
    exit 1
fi

if [[ "$ACTION" == "scale-all" && -z "$REPLICAS" ]]; then
    log_error "Replicas required for scale-all action"
    show_usage
    exit 1
fi

if [[ "$ACTION" =~ ^(auto-enable|auto-disable)$ && -z "$SERVICE" ]]; then
    log_error "Service required for auto-scaling actions"
    show_usage
    exit 1
fi

# Main execution
main() {
    log_info "PersonaPass Kubernetes Scaling Tool"
    log_info "Namespace: $NAMESPACE"
    log_info "Action: $ACTION"
    echo ""
    
    check_cluster_connection
    
    case $ACTION in
        status)
            show_scaling_status
            ;;
        scale)
            scale_service "$SERVICE" "$REPLICAS"
            show_scaling_status
            ;;
        scale-all)
            scale_all_services "$REPLICAS"
            show_scaling_status
            ;;
        auto-enable)
            enable_autoscaling "$SERVICE" "$MIN_REPLICAS" "$MAX_REPLICAS" "$CPU_TARGET"
            show_scaling_status
            ;;
        auto-disable)
            disable_autoscaling "$SERVICE"
            show_scaling_status
            ;;
        load-test)
            apply_load_test_scaling
            show_scaling_status
            ;;
        production)
            apply_production_scaling
            show_scaling_status
            ;;
        development)
            apply_development_scaling
            show_scaling_status
            ;;
        maintenance)
            scale_down_maintenance
            show_scaling_status
            ;;
        *)
            log_error "Unknown action: $ACTION"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "Scaling operation completed successfully! 🎯"
}

# Run main function
main "$@"