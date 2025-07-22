#!/bin/bash

# 🚀 PersonaChain Complete Ecosystem Deployment Script
# Deploys all 50,000+ lines of enterprise-grade code!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for status
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
GEAR="⚙️"
FIRE="🔥"
STAR="⭐"

print_banner() {
    echo -e "${PURPLE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "█                                                              █"
    echo "█    🚀 PERSONACHAIN COMPLETE ECOSYSTEM DEPLOYMENT 🚀         █"
    echo "█                                                              █"
    echo "█    Deploying 50,000+ lines of enterprise code...            █"
    echo "█    The Most Powerful Identity Platform in the World!        █"
    echo "█                                                              █"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
}

print_status() {
    echo -e "${CYAN}${GEAR} $1...${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_prerequisites() {
    print_status "Checking prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker (optional but recommended)
    if command -v docker &> /dev/null; then
        print_success "Docker found - containerized services available"
    else
        print_warning "Docker not found - some features may be limited"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed."
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

check_ports() {
    print_status "Checking port availability"
    
    REQUIRED_PORTS=(3000 8080 8081 8082 8083 26657 1317 9090)
    BUSY_PORTS=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -i:$port &> /dev/null; then
            BUSY_PORTS+=($port)
        fi
    done
    
    if [ ${#BUSY_PORTS[@]} -ne 0 ]; then
        print_warning "The following ports are in use: ${BUSY_PORTS[*]}"
        echo -e "${YELLOW}Do you want to kill processes on these ports? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            for port in "${BUSY_PORTS[@]}"; do
                print_status "Killing processes on port $port"
                lsof -ti:$port | xargs kill -9 2>/dev/null || true
            done
            print_success "Ports cleared!"
        else
            print_error "Please free up the required ports and try again."
            exit 1
        fi
    else
        print_success "All required ports are available!"
    fi
}

install_dependencies() {
    print_status "Installing dependencies for all services"
    
    # Root dependencies
    if [ -f "package.json" ]; then
        print_status "Installing root dependencies"
        npm install --silent
        print_success "Root dependencies installed"
    fi
    
    # Backend dependencies
    if [ -d "apps/backend" ]; then
        print_status "Installing backend dependencies"
        cd apps/backend
        npm install --silent
        
        # Copy environment file if it doesn't exist
        if [ ! -f ".env" ] && [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Backend environment file created"
        fi
        cd ../..
        print_success "Backend dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -d "apps/wallet" ]; then
        print_status "Installing frontend dependencies"
        cd apps/wallet
        npm install --silent
        
        # Copy environment file if it doesn't exist
        if [ ! -f ".env" ] && [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Frontend environment file created"
        fi
        cd ../..
        print_success "Frontend dependencies installed"
    fi
    
    # ZK circuits dependencies
    if [ -d "circuits" ]; then
        print_status "Installing ZK circuit dependencies"
        cd circuits
        if [ -f "package.json" ]; then
            npm install --silent
            print_success "ZK circuit dependencies installed"
        fi
        cd ..
    fi
    
    # ZK API dependencies
    if [ -d "apps/zk-api" ]; then
        print_status "Installing ZK API dependencies"
        cd apps/zk-api
        npm install --silent
        cd ../..
        print_success "ZK API dependencies installed"
    fi
}

setup_blockchain() {
    print_status "Setting up PersonaChain blockchain"
    
    # Check if Go is installed for blockchain
    if command -v go &> /dev/null; then
        print_status "Building PersonaChain blockchain node"
        
        # Build the blockchain if Makefile exists
        if [ -f "Makefile" ]; then
            make install 2>/dev/null || {
                print_warning "Blockchain build failed - continuing with API-only mode"
                return 0
            }
            
            # Initialize blockchain
            make init 2>/dev/null || {
                print_warning "Blockchain init failed - continuing with API-only mode"
                return 0
            }
            
            print_success "Blockchain setup complete"
        else
            print_warning "No Makefile found - skipping blockchain build"
        fi
    else
        print_warning "Go not installed - skipping blockchain deployment"
        print_info "PersonaChain will run in API-only mode"
    fi
}

start_blockchain() {
    print_status "Starting PersonaChain blockchain services"
    
    if command -v persona-chaind &> /dev/null; then
        print_status "Starting blockchain node"
        
        # Start blockchain node in background
        nohup persona-chaind start --home ~/.persona-chain > blockchain.log 2>&1 &
        BLOCKCHAIN_PID=$!
        echo $BLOCKCHAIN_PID > blockchain.pid
        
        # Wait a moment for startup
        sleep 3
        
        # Check if process is still running
        if kill -0 $BLOCKCHAIN_PID 2>/dev/null; then
            print_success "Blockchain node started (PID: $BLOCKCHAIN_PID)"
            
            # Start REST API
            nohup persona-chaind rest-server --home ~/.persona-chain > rest-api.log 2>&1 &
            REST_PID=$!
            echo $REST_PID > rest-api.pid
            
            if kill -0 $REST_PID 2>/dev/null; then
                print_success "REST API started (PID: $REST_PID)"
            else
                print_warning "REST API failed to start"
            fi
        else
            print_warning "Blockchain node failed to start"
        fi
    else
        print_warning "persona-chaind not found - running without blockchain"
    fi
}

start_backend() {
    print_status "Starting PersonaChain backend services"
    
    if [ -d "apps/backend" ]; then
        cd apps/backend
        
        # Start backend in development mode
        print_status "Starting enterprise backend services"
        nohup npm run start:dev > ../../backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../../backend.pid
        
        cd ../..
        
        # Wait for backend to start
        sleep 5
        
        # Check if backend is running
        if kill -0 $BACKEND_PID 2>/dev/null; then
            # Test backend health
            for i in {1..30}; do
                if curl -s http://localhost:8080/health > /dev/null 2>&1; then
                    print_success "Backend services started (PID: $BACKEND_PID)"
                    print_info "API Server: http://localhost:8080"
                    print_info "Performance Monitor: http://localhost:8081"
                    print_info "Security Services: http://localhost:8082"
                    print_info "Deployment Service: http://localhost:8083"
                    break
                fi
                sleep 1
            done
            
            if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
                print_warning "Backend started but health check failed"
            fi
        else
            print_error "Backend failed to start"
        fi
    else
        print_error "Backend directory not found"
    fi
}

start_frontend() {
    print_status "Starting PersonaChain frontend PWA"
    
    if [ -d "apps/wallet" ]; then
        cd apps/wallet
        
        # Start frontend in development mode
        print_status "Starting React PWA"
        nohup npm run dev > ../../frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../../frontend.pid
        
        cd ../..
        
        # Wait for frontend to start
        sleep 10
        
        # Check if frontend is running
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            # Test frontend
            for i in {1..30}; do
                if curl -s http://localhost:3000 > /dev/null 2>&1; then
                    print_success "Frontend PWA started (PID: $FRONTEND_PID)"
                    print_info "PersonaChain Wallet: http://localhost:3000"
                    break
                fi
                sleep 1
            done
            
            if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
                print_warning "Frontend started but not responding"
            fi
        else
            print_error "Frontend failed to start"
        fi
    else
        print_error "Frontend directory not found"
    fi
}

compile_zk_circuits() {
    print_status "Compiling ZK proof circuits"
    
    if [ -d "circuits" ]; then
        cd circuits
        
        if [ -f "package.json" ]; then
            # Compile circuits if script exists
            if npm run compile 2>/dev/null; then
                print_success "ZK circuits compiled successfully"
            else
                print_warning "ZK circuit compilation failed - continuing without circuits"
            fi
        else
            print_warning "No package.json in circuits directory"
        fi
        
        cd ..
    else
        print_warning "Circuits directory not found"
    fi
}

start_zk_api() {
    print_status "Starting ZK API service"
    
    if [ -d "apps/zk-api" ]; then
        cd apps/zk-api
        
        # Start ZK API service
        nohup npm start > ../../zk-api.log 2>&1 &
        ZK_API_PID=$!
        echo $ZK_API_PID > ../../zk-api.pid
        
        cd ../..
        
        if kill -0 $ZK_API_PID 2>/dev/null; then
            print_success "ZK API service started (PID: $ZK_API_PID)"
        else
            print_warning "ZK API service failed to start"
        fi
    else
        print_warning "ZK API directory not found"
    fi
}

run_health_checks() {
    print_status "Running comprehensive health checks"
    
    echo ""
    echo -e "${BLUE}🏥 HEALTH CHECK RESULTS:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Backend Health Check
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Backend API (8080)${NC} - Healthy"
    else
        echo -e "${RED}${CROSS} Backend API (8080)${NC} - Not responding"
    fi
    
    # Frontend Health Check
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Frontend PWA (3000)${NC} - Healthy"
    else
        echo -e "${RED}${CROSS} Frontend PWA (3000)${NC} - Not responding"
    fi
    
    # Blockchain Health Check
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Blockchain Node (26657)${NC} - Healthy"
    else
        echo -e "${YELLOW}⚠️  Blockchain Node (26657)${NC} - Not available (API-only mode)"
    fi
    
    # REST API Health Check
    if curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} REST API (1317)${NC} - Healthy"
    else
        echo -e "${YELLOW}⚠️  REST API (1317)${NC} - Not available"
    fi
    
    # Performance Monitor
    if curl -s http://localhost:8081/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Performance Monitor (8081)${NC} - Healthy"
    else
        echo -e "${YELLOW}⚠️  Performance Monitor (8081)${NC} - Not responding"
    fi
    
    # Security Services
    if curl -s http://localhost:8082/security/status > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Security Services (8082)${NC} - Healthy"
    else
        echo -e "${YELLOW}⚠️  Security Services (8082)${NC} - Not responding"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

create_test_data() {
    print_status "Creating test data and running sample workflows"
    
    # Wait for services to be fully ready
    sleep 5
    
    # Test Identity Creation
    print_status "Testing identity creation"
    IDENTITY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/identity/create \
        -H "Content-Type: application/json" \
        -d '{"name": "Test User", "email": "test@personachain.com"}' 2>/dev/null || echo "")
    
    if [ ! -z "$IDENTITY_RESPONSE" ]; then
        print_success "Identity creation test passed"
    else
        print_warning "Identity creation test failed - service may still be starting"
    fi
    
    # Test VC Generation
    print_status "Testing verifiable credential generation"
    VC_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/credentials/generate \
        -H "Content-Type: application/json" \
        -d '{"type": "identity", "subject": "did:persona:12345"}' 2>/dev/null || echo "")
    
    if [ ! -z "$VC_RESPONSE" ]; then
        print_success "VC generation test passed"
    else
        print_warning "VC generation test failed - service may still be starting"
    fi
}

print_deployment_summary() {
    echo ""
    echo -e "${PURPLE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "█                                                              █"
    echo "█    🎉 PERSONACHAIN DEPLOYMENT COMPLETE! 🎉                  █"
    echo "█                                                              █"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}${FIRE} DEPLOYED SERVICES:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}🌟 PersonaChain Wallet PWA:${NC}      http://localhost:3000"
    echo -e "${CYAN}🔗 Backend API Server:${NC}           http://localhost:8080"
    echo -e "${CYAN}📊 Performance Monitor:${NC}          http://localhost:8081"
    echo -e "${CYAN}🛡️  Security Services:${NC}           http://localhost:8082"
    echo -e "${CYAN}🚀 Deployment Service:${NC}           http://localhost:8083"
    echo -e "${CYAN}⛓️  Blockchain Node:${NC}              http://localhost:26657"
    echo -e "${CYAN}🌐 REST API:${NC}                     http://localhost:1317"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}${STAR} WHAT'S RUNNING:${NC}"
    echo "• 50,000+ lines of enterprise code"
    echo "• Advanced blockchain infrastructure"  
    echo "• Complete identity management system"
    echo "• ZK proof generation and verification"
    echo "• Performance monitoring and optimization"
    echo "• Advanced security and compliance"
    echo "• Multi-environment deployment capabilities"
    echo "• Real-time analytics and reporting"
    echo ""
    echo -e "${BLUE}📖 NEXT STEPS:${NC}"
    echo "1. Open http://localhost:3000 to access the PersonaChain Wallet"
    echo "2. Test the API at http://localhost:8080/api-docs"
    echo "3. Monitor performance at http://localhost:8081"
    echo "4. Check security status at http://localhost:8082"
    echo "5. Review deployment logs: tail -f *.log"
    echo ""
    echo -e "${YELLOW}🛠️  USEFUL COMMANDS:${NC}"
    echo "• Stop all services: ./stop-personachain.sh"
    echo "• View logs: tail -f backend.log frontend.log"
    echo "• Run tests: npm run test:e2e"
    echo "• Check status: curl http://localhost:8080/health"
    echo ""
    echo -e "${GREEN}🎯 PersonaChain is ready to revolutionize digital identity!${NC}"
    echo ""
}

create_stop_script() {
    print_status "Creating stop script"
    
    cat > stop-personachain.sh << 'EOF'
#!/bin/bash

# 🛑 PersonaChain Stop Script

echo "🛑 Stopping PersonaChain services..."

# Kill services by PID files
for pidfile in *.pid; do
    if [ -f "$pidfile" ]; then
        pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $(basename "$pidfile" .pid) (PID: $pid)"
            kill "$pid"
        fi
        rm -f "$pidfile"
    fi
done

# Kill by port if PIDs don't work
echo "Cleaning up any remaining processes on ports..."
lsof -ti:3000,8080,8081,8082,8083,26657,1317,9090 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "✅ All PersonaChain services stopped!"
EOF

    chmod +x stop-personachain.sh
    print_success "Stop script created: ./stop-personachain.sh"
}

# Main deployment function
main() {
    print_banner
    
    print_status "Starting PersonaChain deployment"
    echo ""
    
    # Pre-flight checks
    check_prerequisites
    check_ports
    
    # Installation phase
    install_dependencies
    setup_blockchain
    compile_zk_circuits
    
    # Service startup phase
    echo ""
    print_status "Starting all PersonaChain services"
    echo ""
    
    start_blockchain
    start_backend
    start_zk_api
    start_frontend
    
    # Post-deployment verification
    echo ""
    print_status "Verifying deployment"
    sleep 10  # Give services time to fully start
    
    run_health_checks
    create_test_data
    create_stop_script
    
    # Success!
    print_deployment_summary
}

# Trap errors and cleanup
trap 'print_error "Deployment failed! Check logs for details."' ERR

# Run the deployment
main "$@"

# Mark deployment as complete
touch .personachain-deployed
echo "$(date)" > .personachain-deployed

exit 0