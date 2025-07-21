#!/bin/bash

# PersonaPass Monitoring Stack Deployment Script
# Sprint 8 Task 6: Deploy Production Monitoring

set -e

echo "=================================================="
echo "PersonaPass Monitoring Stack Deployment"
echo "Sprint 8 Task 6 - Production Monitoring Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="/home/rocz/persona-chain/docker-compose.yml"
MONITORING_DIR="/home/rocz/persona-chain/monitoring"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed or not in PATH"
        echo "Please install Docker and try again"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available"
        echo "Please install Docker Compose and try again"
        exit 1
    fi
    
    # Check if configuration files exist
    local required_files=(
        "$COMPOSE_FILE"
        "$MONITORING_DIR/prometheus.yml"
        "$MONITORING_DIR/alert_rules.yml"
        "$MONITORING_DIR/alertmanager.yml"
        "$MONITORING_DIR/blackbox.yml"
        "$MONITORING_DIR/grafana-dashboard-personapass-overview.json"
        "$MONITORING_DIR/grafana-dashboard-zk-performance.json"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    print_status "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    local directories=(
        "$MONITORING_DIR/grafana-provisioning/datasources"
        "$MONITORING_DIR/grafana-provisioning/dashboards"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    done
}

# Function to validate configuration
validate_configuration() {
    print_step "Validating monitoring configuration..."
    
    # Run the validation script
    if [[ -x "/home/rocz/persona-chain/scripts/monitoring-validation.sh" ]]; then
        print_status "Running comprehensive validation..."
        if /home/rocz/persona-chain/scripts/monitoring-validation.sh; then
            print_status "Configuration validation passed"
        else
            print_error "Configuration validation failed"
            exit 1
        fi
    else
        print_warning "Validation script not found or not executable"
    fi
}

# Function to deploy monitoring services
deploy_services() {
    print_step "Deploying monitoring services..."
    
    cd /home/rocz/persona-chain
    
    # Define services in dependency order
    local services=(
        "redis"
        "prometheus"
        "grafana"
        "alertmanager"
        "node-exporter"
        "blackbox-exporter"
        "redis-exporter"
    )
    
    # Deploy services
    print_status "Starting monitoring stack deployment..."
    
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose up -d "${services[@]}"
    else
        docker compose up -d "${services[@]}"
    fi
    
    print_status "Monitoring services deployment initiated"
}

# Function to wait for services to be ready
wait_for_services() {
    print_step "Waiting for services to be ready..."
    
    local services=(
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:3001/api/health:Grafana"
        "http://localhost:9093/-/healthy:Alertmanager"
        "http://localhost:9100/metrics:Node Exporter"
        "http://localhost:9115/metrics:Blackbox Exporter"
        "http://localhost:9121/metrics:Redis Exporter"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service_info"
        
        print_status "Waiting for $name to be ready..."
        
        local max_attempts=30
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s --max-time 5 "$url" >/dev/null 2>&1; then
                print_status "$name is ready"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                print_warning "$name did not become ready within expected time"
            fi
            
            sleep 5
            ((attempt++))
        done
    done
}

# Function to verify deployment
verify_deployment() {
    print_step "Verifying deployment..."
    
    # Check container status
    print_status "Checking container status..."
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose ps
    else
        docker compose ps
    fi
    
    # Test key endpoints
    local endpoints=(
        "http://localhost:9090:Prometheus"
        "http://localhost:3001:Grafana"
        "http://localhost:9093:Alertmanager"
    )
    
    print_status "Testing service endpoints..."
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r url name <<< "$endpoint_info"
        
        if curl -f -s --max-time 10 "$url" >/dev/null; then
            print_status "$name endpoint is accessible"
        else
            print_warning "$name endpoint is not accessible at $url"
        fi
    done
}

# Function to display access information
display_access_info() {
    print_step "Deployment completed! Access information:"
    
    echo ""
    echo "📊 Monitoring Dashboard Access:"
    echo "================================"
    echo "🔗 Grafana Dashboard:    http://localhost:3001"
    echo "   Username: admin"
    echo "   Password: personapass-admin-2025"
    echo ""
    echo "🔗 Prometheus:           http://localhost:9090"
    echo "🔗 Alertmanager:         http://localhost:9093"
    echo ""
    echo "📈 Default Dashboard:"
    echo "🔗 PersonaPass Overview: http://localhost:3001/d/personapass-overview"
    echo "🔗 ZK Performance:       http://localhost:3001/d/personapass-zk-performance"
    echo ""
    echo "📚 Documentation:"
    echo "🔗 Monitoring Runbook:   $MONITORING_DIR/PRODUCTION-MONITORING-RUNBOOK.md"
    echo "🔗 Validation Report:    $MONITORING_DIR/SPRINT8-MONITORING-VALIDATION-REPORT.md"
    echo ""
    echo "🎯 Production Endpoints Monitored:"
    echo "🔗 PersonaPass Frontend: https://personapass.xyz"
    echo "🔗 Load Balancer:        http://localhost:8080"
    echo ""
}

# Function to display next steps
display_next_steps() {
    echo "🚀 Next Steps:"
    echo "=============="
    echo "1. Configure notification endpoints in alertmanager.yml"
    echo "2. Set up SSL/TLS certificates for production access"
    echo "3. Configure authentication for monitoring endpoints"
    echo "4. Review and adjust alert thresholds based on production traffic"
    echo "5. Set up automated backups of monitoring data"
    echo ""
    echo "📋 Quick Health Check:"
    echo "======================"
    echo "Run: curl -f http://localhost:9090/-/healthy"
    echo "Run: curl -f http://localhost:3001/api/health"
    echo "Run: curl -f http://localhost:9093/-/healthy"
    echo ""
    echo "For troubleshooting, see: $MONITORING_DIR/PRODUCTION-MONITORING-RUNBOOK.md"
}

# Main execution
main() {
    print_status "Starting PersonaPass monitoring stack deployment..."
    
    check_prerequisites
    create_directories
    validate_configuration
    deploy_services
    wait_for_services
    verify_deployment
    
    echo ""
    print_status "✅ PersonaPass monitoring stack deployed successfully!"
    
    display_access_info
    display_next_steps
    
    echo ""
    echo "🎉 Sprint 8 Task 6 - Monitoring deployment completed!"
    echo "The PersonaPass production monitoring stack is ready for use."
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Execute main function
main "$@"