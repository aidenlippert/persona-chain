#!/bin/bash

# PersonaChain Zero-Knowledge Proof Circuit Compilation Script
# Compiles all production Circom circuits with optimizations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CIRCUIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${CIRCUIT_DIR}/build"
PTAU_DIR="${CIRCUIT_DIR}/ptau"
KEYS_DIR="${CIRCUIT_DIR}/keys"

# Circuit configurations
declare -A CIRCUITS=(
    ["age_verification"]="groth16,plonk"
    ["membership_proof"]="groth16,plonk"  
    ["range_proof"]="groth16,plonk"
    ["selective_disclosure"]="groth16,plonk"
)

# Power of tau file for trusted setup
PTAU_FILE="powersOfTau28_hez_final_20.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN} $1${NC}"
}

warning() {
    echo -e "${YELLOW}  $1${NC}"
}

error() {
    echo -e "${RED} $1${NC}"
    exit 1
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v circom &> /dev/null; then
        error "circom not found. Install with: npm install -g circom"
    fi
    
    if ! command -v snarkjs &> /dev/null; then
        error "snarkjs not found. Install with: npm install -g snarkjs"
    fi
    
    success "Dependencies check passed"
}

# Setup directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p "${BUILD_DIR}" "${PTAU_DIR}" "${KEYS_DIR}"
    
    for circuit in "${!CIRCUITS[@]}"; do
        mkdir -p "${BUILD_DIR}/${circuit}"
        mkdir -p "${KEYS_DIR}/${circuit}"
    done
    
    success "Directories created"
}

# Download powers of tau file
download_ptau() {
    log "Checking powers of tau file..."
    
    if [[ ! -f "${PTAU_DIR}/${PTAU_FILE}" ]]; then
        log "Downloading powers of tau file..."
        wget -O "${PTAU_DIR}/${PTAU_FILE}" "${PTAU_URL}"
        success "Powers of tau file downloaded"
    else
        success "Powers of tau file already exists"
    fi
}

# Compile circuit
compile_circuit() {
    local circuit_name=$1
    local circuit_file="${CIRCUIT_DIR}/${circuit_name}.circom"
    local build_dir="${BUILD_DIR}/${circuit_name}"
    
    log "Compiling circuit: ${circuit_name}"
    
    if [[ ! -f "${circuit_file}" ]]; then
        error "Circuit file not found: ${circuit_file}"
    fi
    
    # Compile with optimization
    circom "${circuit_file}" \
        --r1cs \
        --wasm \
        --sym \
        --c \
        --output "${build_dir}" \
        --O2 \
        --prime bn128
    
    success "Circuit ${circuit_name} compiled successfully"
}

# Generate proving keys for Groth16
generate_groth16_keys() {
    local circuit_name=$1
    local build_dir="${BUILD_DIR}/${circuit_name}"
    local keys_dir="${KEYS_DIR}/${circuit_name}"
    local r1cs_file="${build_dir}/${circuit_name}.r1cs"
    
    log "Generating Groth16 keys for ${circuit_name}..."
    
    # Generate proving key
    snarkjs groth16 setup \
        "${r1cs_file}" \
        "${PTAU_DIR}/${PTAU_FILE}" \
        "${keys_dir}/${circuit_name}_groth16_0000.zkey"
    
    # Apply random beacon (dummy for development)
    snarkjs zkey beacon \
        "${keys_dir}/${circuit_name}_groth16_0000.zkey" \
        "${keys_dir}/${circuit_name}_groth16_final.zkey" \
        0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="PersonaChain Development"
    
    # Export verification key
    snarkjs zkey export verificationkey \
        "${keys_dir}/${circuit_name}_groth16_final.zkey" \
        "${keys_dir}/${circuit_name}_groth16_verification_key.json"
    
    # Export Solidity verifier
    snarkjs zkey export solidityverifier \
        "${keys_dir}/${circuit_name}_groth16_final.zkey" \
        "${keys_dir}/${circuit_name}_groth16_verifier.sol"
    
    success "Groth16 keys generated for ${circuit_name}"
}

# Generate proving keys for PLONK
generate_plonk_keys() {
    local circuit_name=$1
    local build_dir="${BUILD_DIR}/${circuit_name}"
    local keys_dir="${KEYS_DIR}/${circuit_name}"
    local r1cs_file="${build_dir}/${circuit_name}.r1cs"
    
    log "Generating PLONK keys for ${circuit_name}..."
    
    # Generate proving key
    snarkjs plonk setup \
        "${r1cs_file}" \
        "${PTAU_DIR}/${PTAU_FILE}" \
        "${keys_dir}/${circuit_name}_plonk_final.zkey"
    
    # Export verification key
    snarkjs zkey export verificationkey \
        "${keys_dir}/${circuit_name}_plonk_final.zkey" \
        "${keys_dir}/${circuit_name}_plonk_verification_key.json"
    
    # Export Solidity verifier
    snarkjs zkey export solidityverifier \
        "${keys_dir}/${circuit_name}_plonk_final.zkey" \
        "${keys_dir}/${circuit_name}_plonk_verifier.sol"
    
    success "PLONK keys generated for ${circuit_name}"
}

# Generate test inputs
generate_test_inputs() {
    local circuit_name=$1
    local keys_dir="${KEYS_DIR}/${circuit_name}"
    
    log "Generating test inputs for ${circuit_name}..."
    
    case "${circuit_name}" in
        "age_verification")
            cat > "${keys_dir}/test_input.json" << EOF
{
    "minimum_age": "18",
    "maximum_age": "120", 
    "current_timestamp": "$(date +%s)",
    "merkle_root": "123456789",
    "verifier_id": "1",
    "date_of_birth": "$(($(date +%s) - 18 * 365 * 24 * 3600))",
    "salt": "987654321",
    "nonce": "555",
    "secret_key": "111111111"
}
EOF
            ;;
        "membership_proof")
            cat > "${keys_dir}/test_input.json" << EOF
{
    "merkle_root": "123456789",
    "set_id": "1",
    "verifier_id": "1", 
    "timestamp": "$(date +%s)",
    "challenge": "999888777",
    "member_value": "555666777",
    "path_elements": $(printf '[%s]' $(printf '"0"%.0s,' {1..20})),
    "path_indices": $(printf '[%s]' $(printf '"0"%.0s,' {1..20})),
    "salt": "123123123",
    "secret_key": "456456456"
}
EOF
            ;;
        "range_proof")
            cat > "${keys_dir}/test_input.json" << EOF
{
    "min_bound": "18",
    "max_bound": "65",
    "range_id": "1",
    "verifier_id": "1",
    "timestamp": "$(date +%s)",
    "challenge": "777888999",
    "secret_value": "25",
    "salt": "111222333",
    "nonce": "444555666",
    "secret_key": "789789789"
}
EOF
            ;;
        "selective_disclosure")
            cat > "${keys_dir}/test_input.json" << EOF
{
    "credential_root": "987654321",
    "issuer_id": "1",
    "verifier_id": "1",
    "disclosure_mask": ["1", "0", "1", "0", "1", "0", "1", "0"],
    "timestamp": "$(date +%s)",
    "challenge": "111222333",
    "attributes": ["100", "200", "300", "400", "500", "600", "700", "800"],
    "salts": ["11", "22", "33", "44", "55", "66", "77", "88"],
    "path_elements": $(printf '[%s]' $(printf '"0"%.0s,' {1..16})),
    "path_indices": $(printf '[%s]' $(printf '"0"%.0s,' {1..16})),
    "secret_key": "999888777",
    "nonce": "666555444"
}
EOF
            ;;
    esac
    
    success "Test inputs generated for ${circuit_name}"
}

# Test circuit with proof generation
test_circuit() {
    local circuit_name=$1
    local proving_system=$2
    local build_dir="${BUILD_DIR}/${circuit_name}"
    local keys_dir="${KEYS_DIR}/${circuit_name}"
    
    log "Testing ${circuit_name} with ${proving_system}..."
    
    # Generate witness
    cd "${build_dir}/${circuit_name}_js"
    node generate_witness.js \
        "${circuit_name}.wasm" \
        "${keys_dir}/test_input.json" \
        witness.wtns
    
    cd "${CIRCUIT_DIR}"
    
    # Generate proof
    case "${proving_system}" in
        "groth16")
            snarkjs groth16 prove \
                "${keys_dir}/${circuit_name}_groth16_final.zkey" \
                "${build_dir}/${circuit_name}_js/witness.wtns" \
                "${keys_dir}/proof_groth16.json" \
                "${keys_dir}/public_groth16.json"
            
            # Verify proof
            snarkjs groth16 verify \
                "${keys_dir}/${circuit_name}_groth16_verification_key.json" \
                "${keys_dir}/public_groth16.json" \
                "${keys_dir}/proof_groth16.json"
            ;;
        "plonk")
            snarkjs plonk prove \
                "${keys_dir}/${circuit_name}_plonk_final.zkey" \
                "${build_dir}/${circuit_name}_js/witness.wtns" \
                "${keys_dir}/proof_plonk.json" \
                "${keys_dir}/public_plonk.json"
            
            # Verify proof
            snarkjs plonk verify \
                "${keys_dir}/${circuit_name}_plonk_verification_key.json" \
                "${keys_dir}/public_plonk.json" \
                "${keys_dir}/proof_plonk.json"
            ;;
    esac
    
    success "${circuit_name} ${proving_system} test passed"
}

# Generate circuit info
generate_circuit_info() {
    local circuit_name=$1
    local build_dir="${BUILD_DIR}/${circuit_name}"
    local keys_dir="${KEYS_DIR}/${circuit_name}"
    
    log "Generating circuit info for ${circuit_name}..."
    
    # Get circuit info
    snarkjs r1cs info "${build_dir}/${circuit_name}.r1cs" > "${keys_dir}/circuit_info.txt"
    
    # Get constraint count
    local constraints=$(snarkjs r1cs info "${build_dir}/${circuit_name}.r1cs" | grep "# of Constraints" | awk '{print $4}')
    local variables=$(snarkjs r1cs info "${build_dir}/${circuit_name}.r1cs" | grep "# of Variables" | awk '{print $4}')
    local private_inputs=$(snarkjs r1cs info "${build_dir}/${circuit_name}.r1cs" | grep "# of Private Inputs" | awk '{print $5}')
    local public_inputs=$(snarkjs r1cs info "${build_dir}/${circuit_name}.r1cs" | grep "# of Public Inputs" | awk '{print $5}')
    
    cat > "${keys_dir}/circuit_stats.json" << EOF
{
    "circuit_name": "${circuit_name}",
    "constraints": ${constraints},
    "variables": ${variables},
    "private_inputs": ${private_inputs},
    "public_inputs": ${public_inputs},
    "compiled_at": "$(date -Iseconds)"
}
EOF
    
    success "Circuit info generated for ${circuit_name}"
}

# Main execution
main() {
    log "Starting PersonaChain ZK Circuit Compilation"
    
    check_dependencies
    setup_directories
    download_ptau
    
    for circuit_name in "${!CIRCUITS[@]}"; do
        log "Processing circuit: ${circuit_name}"
        
        # Compile circuit
        compile_circuit "${circuit_name}"
        
        # Generate test inputs
        generate_test_inputs "${circuit_name}"
        
        # Process proving systems
        IFS=',' read -ra proving_systems <<< "${CIRCUITS[${circuit_name}]}"
        for proving_system in "${proving_systems[@]}"; do
            case "${proving_system}" in
                "groth16")
                    generate_groth16_keys "${circuit_name}"
                    test_circuit "${circuit_name}" "groth16"
                    ;;
                "plonk")
                    generate_plonk_keys "${circuit_name}"
                    test_circuit "${circuit_name}" "plonk"
                    ;;
            esac
        done
        
        # Generate circuit info
        generate_circuit_info "${circuit_name}"
        
        success "Circuit ${circuit_name} completed successfully"
    done
    
    log "All circuits compiled and tested successfully!"
    log "Circuit artifacts available in: ${BUILD_DIR}"
    log "Proving keys available in: ${KEYS_DIR}"
}

# Command line options
case "${1:-}" in
    "clean")
        log "Cleaning build artifacts..."
        rm -rf "${BUILD_DIR}" "${KEYS_DIR}"
        success "Build artifacts cleaned"
        ;;
    "circuit")
        if [[ -n "${2:-}" ]] && [[ -n "${CIRCUITS[${2}]}" ]]; then
            circuit_name="${2}"
            log "Compiling single circuit: ${circuit_name}"
            
            check_dependencies
            setup_directories
            download_ptau
            
            compile_circuit "${circuit_name}"
            generate_test_inputs "${circuit_name}"
            
            IFS=',' read -ra proving_systems <<< "${CIRCUITS[${circuit_name}]}"
            for proving_system in "${proving_systems[@]}"; do
                case "${proving_system}" in
                    "groth16")
                        generate_groth16_keys "${circuit_name}"
                        test_circuit "${circuit_name}" "groth16"
                        ;;
                    "plonk")
                        generate_plonk_keys "${circuit_name}"
                        test_circuit "${circuit_name}" "plonk"
                        ;;
                esac
            done
            
            generate_circuit_info "${circuit_name}"
            success "Circuit ${circuit_name} completed"
        else
            error "Unknown circuit: ${2:-}. Available: ${!CIRCUITS[*]}"
        fi
        ;;
    "test")
        if [[ -n "${2:-}" ]] && [[ -n "${CIRCUITS[${2}]}" ]]; then
            circuit_name="${2}"
            proving_system="${3:-groth16}"
            
            log "Testing circuit: ${circuit_name} with ${proving_system}"
            test_circuit "${circuit_name}" "${proving_system}"
        else
            error "Usage: $0 test <circuit_name> [proving_system]"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "PersonaChain ZK Circuit Compilation Script"
        echo
        echo "Usage: $0 [command] [options]"
        echo
        echo "Commands:"
        echo "  (default)           Compile all circuits"
        echo "  clean               Clean build artifacts"
        echo "  circuit <name>      Compile specific circuit"
        echo "  test <name> [sys]   Test specific circuit with proving system"
        echo "  help                Show this help message"
        echo
        echo "Available circuits: ${!CIRCUITS[*]}"
        echo "Available proving systems: groth16, plonk"
        ;;
    *)
        main
        ;;
esac