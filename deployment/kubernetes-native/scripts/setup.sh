#!/bin/bash

# PersonaPass Kubernetes-Native Deployment Setup Script
# Sets up complete Kubernetes infrastructure with Istio, KEDA, and Prometheus

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
CLUSTER_NAME=${CLUSTER_NAME:-personapass-cluster}

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Required tools
    local required_tools=(
        "kubectl"
        "helm"
        "docker"
        "istioctl"
        "jq"
        "curl"
        "openssl"
    )
    
    for tool in "${required_tools[@]}"; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and run the script again."
        exit 1
    fi
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check Kubernetes version
    local k8s_version
    k8s_version=$(kubectl version --client -o json | jq -r '.clientVersion.gitVersion' | sed 's/v//')
    local required_version="1.26.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$k8s_version" | sort -V | head -n1 | grep -q "^$required_version$"; then
        log_error "Kubernetes client version $k8s_version is below required version $required_version"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Function to create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    kubectl apply -f "$BASE_DIR/manifests/namespaces/namespaces.yaml"
    
    # Wait for namespaces to be ready
    local namespaces=(
        "personapass"
        "personapass-staging" 
        "personapass-dev"
        "monitoring"
        "istio-system"
        "keda"
        "cert-manager"
        "ingress-nginx"
        "external-dns"
        "vault"
    )
    
    for namespace in "${namespaces[@]}"; do
        kubectl wait --for=condition=Active namespace/"$namespace" --timeout=60s
    done
    
    log_success "Namespaces created successfully"
}

# Function to install cert-manager
install_cert_manager() {
    log_info "Installing cert-manager..."
    
    # Add Jetstack Helm repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Install cert-manager
    helm upgrade --install \
        cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --version v1.13.0 \
        --set installCRDs=true \
        --set global.leaderElection.namespace=cert-manager \
        --set extraArgs='{--enable-certificate-owner-ref=true}' \
        --wait
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=Available deployment/cert-manager --namespace=cert-manager --timeout=300s
    kubectl wait --for=condition=Available deployment/cert-manager-cainjector --namespace=cert-manager --timeout=300s
    kubectl wait --for=condition=Available deployment/cert-manager-webhook --namespace=cert-manager --timeout=300s
    
    log_success "cert-manager installed successfully"
}

# Function to install Istio
install_istio() {
    log_info "Installing Istio service mesh..."
    
    # Check if istioctl is available
    if ! command_exists istioctl; then
        log_error "istioctl not found. Please install Istio CLI first."
        exit 1
    fi
    
    # Install Istio control plane
    istioctl install --set values.defaultRevision=default -y
    
    # Apply Istio configuration
    kubectl apply -f "$BASE_DIR/istio/installation/istio-operator.yaml"
    
    # Install Istio gateways and virtual services
    kubectl apply -f "$BASE_DIR/istio/gateways/"
    kubectl apply -f "$BASE_DIR/istio/virtual-services/"
    
    # Enable Istio injection for PersonaPass namespaces
    kubectl label namespace personapass istio-injection=enabled --overwrite
    kubectl label namespace personapass-staging istio-injection=enabled --overwrite
    kubectl label namespace personapass-dev istio-injection=enabled --overwrite
    
    # Wait for Istio components to be ready
    kubectl wait --for=condition=Available deployment/istiod --namespace=istio-system --timeout=300s
    kubectl wait --for=condition=Available deployment/istio-ingressgateway --namespace=istio-system --timeout=300s
    
    log_success "Istio service mesh installed successfully"
}

# Function to install KEDA
install_keda() {
    log_info "Installing KEDA auto-scaler..."
    
    # Add KEDA Helm repository
    helm repo add kedacore https://kedacore.github.io/charts
    helm repo update
    
    # Install KEDA
    helm upgrade --install \
        keda kedacore/keda \
        --namespace keda \
        --version 2.12.0 \
        --set prometheus.metricServer.enabled=true \
        --set prometheus.operator.enabled=true \
        --set logging.operator.level=info \
        --set logging.metricServer.level=info \
        --wait
    
    # Apply KEDA configurations
    kubectl apply -f "$BASE_DIR/keda/scaled-objects/"
    
    # Wait for KEDA components to be ready
    kubectl wait --for=condition=Available deployment/keda-operator --namespace=keda --timeout=300s
    kubectl wait --for=condition=Available deployment/keda-metrics-apiserver --namespace=keda --timeout=300s
    
    log_success "KEDA auto-scaler installed successfully"
}

# Function to install Prometheus monitoring
install_prometheus() {
    log_info "Installing Prometheus monitoring stack..."
    
    # Add Prometheus Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    helm upgrade --install \
        prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --version 54.0.0 \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.retentionSize=50GB \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=fast-ssd \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
        --set grafana.adminPassword=PersonaPass2024! \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.size=10Gi \
        --set grafana.persistence.storageClassName=fast-ssd \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.storageClassName=fast-ssd \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
        --wait
    
    # Apply Prometheus configurations
    kubectl apply -f "$BASE_DIR/prometheus/installation/"
    kubectl apply -f "$BASE_DIR/prometheus/rules/"
    
    # Install Jaeger tracing
    kubectl apply -f "$BASE_DIR/jaeger/installation/"
    
    # Wait for monitoring components to be ready
    kubectl wait --for=condition=Available deployment/prometheus-kube-prometheus-prometheus-operator --namespace=monitoring --timeout=300s
    kubectl wait --for=condition=Available deployment/prometheus-grafana --namespace=monitoring --timeout=300s
    
    log_success "Prometheus monitoring stack installed successfully"
}

# Function to install ingress controller
install_ingress() {
    log_info "Installing NGINX Ingress Controller..."
    
    # Add NGINX Helm repository
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    # Install NGINX Ingress Controller
    helm upgrade --install \
        ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --version 4.8.0 \
        --set controller.replicaCount=2 \
        --set controller.nodeSelector."kubernetes\.io/arch"=amd64 \
        --set controller.admissionWebhooks.patch.nodeSelector."kubernetes\.io/arch"=amd64 \
        --set controller.service.type=LoadBalancer \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"=nlb \
        --set controller.metrics.enabled=true \
        --set controller.metrics.serviceMonitor.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"=true \
        --set controller.podAnnotations."prometheus\.io/port"=10254 \
        --wait
    
    # Wait for ingress controller to be ready
    kubectl wait --for=condition=Available deployment/ingress-nginx-controller --namespace=ingress-nginx --timeout=300s
    
    log_success "NGINX Ingress Controller installed successfully"
}

# Function to install external-dns
install_external_dns() {
    log_info "Installing External DNS..."
    
    # Add External DNS Helm repository
    helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
    helm repo update
    
    # Install External DNS (configure for your DNS provider)
    helm upgrade --install \
        external-dns external-dns/external-dns \
        --namespace external-dns \
        --version 1.14.0 \
        --set provider=aws \
        --set aws.zoneType=public \
        --set txtOwnerId=personapass-cluster \
        --set domainFilters[0]=personapass.com \
        --set policy=sync \
        --set registry=txt \
        --set interval=1m \
        --set logLevel=info \
        --wait
    
    log_success "External DNS installed successfully"
}

# Function to deploy PersonaPass applications
deploy_applications() {
    log_info "Deploying PersonaPass applications..."
    
    # Apply ConfigMaps and Secrets first
    kubectl apply -f "$BASE_DIR/manifests/configmaps/"
    kubectl apply -f "$BASE_DIR/manifests/secrets/"
    
    # Apply Services
    kubectl apply -f "$BASE_DIR/manifests/services/"
    
    # Apply Deployments
    kubectl apply -f "$BASE_DIR/manifests/deployments/"
    
    # Apply Ingress resources
    kubectl apply -f "$BASE_DIR/manifests/ingress/"
    
    # Apply RBAC
    kubectl apply -f "$BASE_DIR/manifests/rbac/"
    
    # Apply Network Policies
    kubectl apply -f "$BASE_DIR/manifests/policies/"
    
    # Wait for applications to be ready
    local services=(
        "identity-service"
        "wallet-api"
        "zk-proof-service"
        "document-verification"
        "multi-tenant-platform"
        "hsm-enterprise"
    )
    
    for service in "${services[@]}"; do
        if kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            log_info "Waiting for $service to be ready..."
            kubectl wait --for=condition=Available deployment/"$service" --namespace="$NAMESPACE" --timeout=300s
        fi
    done
    
    log_success "PersonaPass applications deployed successfully"
}

# Function to setup monitoring dashboards
setup_monitoring() {
    log_info "Setting up monitoring dashboards..."
    
    # Apply Grafana dashboards
    kubectl apply -f "$BASE_DIR/grafana/dashboards/"
    
    # Apply Prometheus alerting rules
    kubectl apply -f "$BASE_DIR/prometheus/rules/"
    
    # Create monitoring ingress
    kubectl apply -f "$BASE_DIR/manifests/ingress/monitoring-ingress.yaml"
    
    log_success "Monitoring dashboards configured successfully"
}

# Function to verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check namespace status
    kubectl get namespaces
    
    # Check Istio status
    istioctl proxy-status
    
    # Check KEDA status
    kubectl get scaledobjects -A
    
    # Check Prometheus status
    kubectl get prometheus -A
    
    # Check application status
    kubectl get pods,svc,ingress -n "$NAMESPACE"
    
    # Check monitoring status
    kubectl get pods,svc -n monitoring
    
    log_success "Installation verification completed"
}

# Function to display access information
display_access_info() {
    log_info "Deployment completed! Access information:"
    echo ""
    echo "🔗 Application URLs:"
    echo "   - API: https://api.personapass.com"
    echo "   - Wallet: https://wallet.personapass.com"
    echo "   - Admin: https://admin.personapass.com"
    echo ""
    echo "📊 Monitoring URLs:"
    echo "   - Grafana: https://grafana.personapass.com"
    echo "   - Prometheus: https://prometheus.personapass.com"
    echo "   - Jaeger: https://jaeger.personapass.com"
    echo ""
    echo "🔑 Default Credentials:"
    echo "   - Grafana: admin / PersonaPass2024!"
    echo ""
    echo "📋 Useful Commands:"
    echo "   - Check status: kubectl get pods -n personapass"
    echo "   - View logs: kubectl logs -f deployment/identity-service -n personapass"
    echo "   - Scale service: kubectl scale deployment identity-service --replicas=5 -n personapass"
    echo "   - Istio status: istioctl proxy-status"
    echo "   - KEDA scalers: kubectl get scaledobjects -n personapass"
    echo ""
    log_success "PersonaPass Kubernetes-Native Platform is ready! 🚀"
}

# Main execution
main() {
    log_info "Starting PersonaPass Kubernetes-Native Deployment Setup"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Cluster: $CLUSTER_NAME"
    echo ""
    
    check_prerequisites
    create_namespaces
    install_cert_manager
    install_istio
    install_keda
    install_prometheus
    install_ingress
    install_external_dns
    deploy_applications
    setup_monitoring
    verify_installation
    display_access_info
}

# Run main function
main "$@"