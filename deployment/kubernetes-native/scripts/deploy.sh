#!/bin/bash

# PersonaPass Kubernetes-Native Application Deployment Script
# Deploys PersonaPass applications with rolling updates and health checks

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
ENVIRONMENT=${ENVIRONMENT:-production}
IMAGE_TAG=${IMAGE_TAG:-latest}
DRY_RUN=${DRY_RUN:-false}

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

# Function to check if kubectl can connect to cluster
check_cluster_connection() {
    log_info "Checking cluster connection..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    local cluster_name
    cluster_name=$(kubectl config current-context)
    log_info "Connected to cluster: $cluster_name"
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist. Please run setup.sh first."
        exit 1
    fi
    
    log_success "Cluster connection verified"
}

# Function to update image tags in deployment files
update_image_tags() {
    log_info "Updating image tags to: $IMAGE_TAG"
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        local deployment_file="$BASE_DIR/manifests/deployments/${service}.yaml"
        if [[ -f "$deployment_file" ]]; then
            # Create backup
            cp "$deployment_file" "${deployment_file}.backup"
            
            # Update image tag
            sed -i.tmp "s|image: personapass/${service}:.*|image: personapass/${service}:${IMAGE_TAG}|g" "$deployment_file"
            rm -f "${deployment_file}.tmp"
            
            log_info "Updated image tag for $service"
        fi
    done
    
    log_success "Image tags updated successfully"
}

# Function to validate manifests
validate_manifests() {
    log_info "Validating Kubernetes manifests..."
    
    local manifest_dirs=(
        "$BASE_DIR/manifests/configmaps"
        "$BASE_DIR/manifests/secrets"
        "$BASE_DIR/manifests/services"
        "$BASE_DIR/manifests/deployments"
        "$BASE_DIR/manifests/ingress"
        "$BASE_DIR/manifests/rbac"
        "$BASE_DIR/manifests/policies"
    )
    
    for dir in "${manifest_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            for file in "$dir"/*.yaml; do
                if [[ -f "$file" ]]; then
                    log_info "Validating: $file"
                    if ! kubectl apply --dry-run=client -f "$file" &> /dev/null; then
                        log_error "Invalid manifest: $file"
                        exit 1
                    fi
                fi
            done
        fi
    done
    
    log_success "All manifests are valid"
}

# Function to apply ConfigMaps and Secrets
apply_config() {
    log_info "Applying ConfigMaps and Secrets..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    # Apply ConfigMaps
    if [[ -d "$BASE_DIR/manifests/configmaps" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/configmaps/" --namespace="$NAMESPACE"
    fi
    
    # Apply Secrets
    if [[ -d "$BASE_DIR/manifests/secrets" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/secrets/" --namespace="$NAMESPACE"
    fi
    
    log_success "Configuration applied successfully"
}

# Function to apply RBAC
apply_rbac() {
    log_info "Applying RBAC configurations..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    if [[ -d "$BASE_DIR/manifests/rbac" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/rbac/" --namespace="$NAMESPACE"
    fi
    
    log_success "RBAC configurations applied successfully"
}

# Function to apply Services
apply_services() {
    log_info "Applying Services..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    if [[ -d "$BASE_DIR/manifests/services" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/services/" --namespace="$NAMESPACE"
    fi
    
    log_success "Services applied successfully"
}

# Function to deploy applications with rolling updates
deploy_applications() {
    log_info "Deploying applications with rolling updates..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        local deployment_file="$BASE_DIR/manifests/deployments/${service}.yaml"
        if [[ -f "$deployment_file" ]]; then
            log_info "Deploying $service..."
            
            # Apply deployment
            kubectl apply $dry_run_flag -f "$deployment_file" --namespace="$NAMESPACE"
            
            if [[ "$DRY_RUN" != "true" ]]; then
                # Wait for rollout to complete
                log_info "Waiting for $service rollout to complete..."
                if kubectl rollout status deployment/"$service" --namespace="$NAMESPACE" --timeout=600s; then
                    log_success "$service deployed successfully"
                else
                    log_error "$service deployment failed"
                    
                    # Show recent events and logs for debugging
                    log_info "Recent events for $service:"
                    kubectl get events --namespace="$NAMESPACE" --field-selector involvedObject.name="$service" --sort-by='.lastTimestamp' | tail -10
                    
                    log_info "Recent logs for $service:"
                    kubectl logs deployment/"$service" --namespace="$NAMESPACE" --tail=20
                    
                    exit 1
                fi
            fi
        else
            log_warn "Deployment file not found for $service: $deployment_file"
        fi
    done
    
    log_success "All applications deployed successfully"
}

# Function to apply Ingress resources
apply_ingress() {
    log_info "Applying Ingress resources..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    if [[ -d "$BASE_DIR/manifests/ingress" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/ingress/" --namespace="$NAMESPACE"
    fi
    
    log_success "Ingress resources applied successfully"
}

# Function to apply Network Policies
apply_network_policies() {
    log_info "Applying Network Policies..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    if [[ -d "$BASE_DIR/manifests/policies" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/manifests/policies/" --namespace="$NAMESPACE"
    fi
    
    log_success "Network Policies applied successfully"
}

# Function to update KEDA scalers
update_keda_scalers() {
    log_info "Updating KEDA auto-scalers..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    if [[ -d "$BASE_DIR/keda/scaled-objects" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/keda/scaled-objects/" --namespace="$NAMESPACE"
    fi
    
    log_success "KEDA auto-scalers updated successfully"
}

# Function to update Istio configurations
update_istio_config() {
    log_info "Updating Istio service mesh configurations..."
    
    local dry_run_flag=""
    if [[ "$DRY_RUN" == "true" ]]; then
        dry_run_flag="--dry-run=client"
    fi
    
    # Update Virtual Services
    if [[ -d "$BASE_DIR/istio/virtual-services" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/istio/virtual-services/" --namespace="$NAMESPACE"
    fi
    
    # Update Destination Rules
    if [[ -d "$BASE_DIR/istio/destination-rules" ]]; then
        kubectl apply $dry_run_flag -f "$BASE_DIR/istio/destination-rules/" --namespace="$NAMESPACE"
    fi
    
    log_success "Istio configurations updated successfully"
}

# Function to run health checks
run_health_checks() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Skipping health checks in dry-run mode"
        return
    fi
    
    log_info "Running health checks..."
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        if kubectl get deployment "$service" --namespace="$NAMESPACE" &> /dev/null; then
            log_info "Checking health of $service..."
            
            # Check if pods are ready
            local ready_pods
            ready_pods=$(kubectl get deployment "$service" --namespace="$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired_pods
            desired_pods=$(kubectl get deployment "$service" --namespace="$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready_pods" == "$desired_pods" ]]; then
                log_success "$service is healthy ($ready_pods/$desired_pods pods ready)"
            else
                log_warn "$service health check failed ($ready_pods/$desired_pods pods ready)"
            fi
            
            # Check service endpoints
            if kubectl get service "$service" --namespace="$NAMESPACE" &> /dev/null; then
                local endpoints
                endpoints=$(kubectl get endpoints "$service" --namespace="$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
                if [[ "$endpoints" -gt 0 ]]; then
                    log_success "$service has $endpoints healthy endpoints"
                else
                    log_warn "$service has no healthy endpoints"
                fi
            fi
        fi
    done
    
    log_success "Health checks completed"
}

# Function to display deployment status
show_deployment_status() {
    log_info "Deployment Status Summary:"
    echo ""
    
    # Show deployments
    echo "📦 Deployments:"
    kubectl get deployments --namespace="$NAMESPACE" -o wide
    echo ""
    
    # Show services
    echo "🔗 Services:"
    kubectl get services --namespace="$NAMESPACE" -o wide
    echo ""
    
    # Show ingress
    echo "🌐 Ingress:"
    kubectl get ingress --namespace="$NAMESPACE" -o wide
    echo ""
    
    # Show KEDA scalers
    echo "📈 KEDA Scalers:"
    kubectl get scaledobjects --namespace="$NAMESPACE" -o wide
    echo ""
    
    # Show Istio virtual services
    echo "🕸️ Istio Virtual Services:"
    kubectl get virtualservices --namespace="$NAMESPACE" -o wide
    echo ""
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Show resource usage
        echo "📊 Resource Usage:"
        kubectl top pods --namespace="$NAMESPACE" --containers 2>/dev/null || echo "Metrics server not available"
        echo ""
    fi
}

# Function to cleanup backup files
cleanup_backups() {
    log_info "Cleaning up backup files..."
    
    find "$BASE_DIR" -name "*.backup" -type f -delete
    
    log_success "Backup files cleaned up"
}

# Function to restore from backup if deployment fails
restore_from_backup() {
    log_error "Deployment failed. Restoring from backup..."
    
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        local deployment_file="$BASE_DIR/manifests/deployments/${service}.yaml"
        local backup_file="${deployment_file}.backup"
        
        if [[ -f "$backup_file" ]]; then
            mv "$backup_file" "$deployment_file"
            log_info "Restored $service deployment file from backup"
        fi
    done
    
    log_success "Backup restoration completed"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy PersonaPass applications to Kubernetes with rolling updates.

Options:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: personapass)
    -e, --environment ENV        Environment (default: production)
    -t, --tag TAG               Docker image tag (default: latest)
    -d, --dry-run               Perform dry-run without applying changes
    -h, --help                  Show this help message

Examples:
    $0                          # Deploy with defaults
    $0 -t v1.2.3               # Deploy specific version
    $0 -n personapass-staging  # Deploy to staging namespace
    $0 -d                       # Dry-run deployment

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
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
    log_info "Starting PersonaPass Kubernetes-Native Application Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Image Tag: $IMAGE_TAG"
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Mode: DRY RUN"
    fi
    echo ""
    
    # Set trap to restore from backup on failure
    trap 'restore_from_backup' ERR
    
    check_cluster_connection
    update_image_tags
    validate_manifests
    apply_config
    apply_rbac
    apply_services
    deploy_applications
    apply_ingress
    apply_network_policies
    update_keda_scalers
    update_istio_config
    run_health_checks
    show_deployment_status
    cleanup_backups
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Dry-run deployment completed successfully! 🎯"
    else
        log_success "PersonaPass applications deployed successfully! 🚀"
    fi
}

# Run main function
main "$@"