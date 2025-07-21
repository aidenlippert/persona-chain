#!/bin/bash

# Test script for dynamic verification endpoints
# This script tests the new /api/getRequirements and /api/getVc endpoints

set -e

API_BASE_URL="http://localhost:8080"
TEST_DID="did:persona:test123"
TEST_CONTROLLER="cosmos1test1"

echo "🧪 Testing Dynamic Verification Endpoints"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make HTTP requests and check responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $API_BASE_URL$endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint")
    fi
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (all lines except last)
    body=$(echo "$response" | head -n -1)
    
    echo "Response Code: $http_code"
    echo "Response Body: $body"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL - Expected $expected_status, got $http_code${NC}"
        return 1
    fi
}

# Test 1: Health check
echo -e "\n${YELLOW}=== Test 1: Health Check ===${NC}"
test_endpoint "GET" "/health" "" "200" "Health endpoint"

# Test 2: Get requirements for 'store' use case
echo -e "\n${YELLOW}=== Test 2: Get Requirements for Store ===${NC}"
store_requirements='{
    "did": "'$TEST_DID'",
    "useCase": "store"
}'
test_endpoint "POST" "/api/getRequirements" "$store_requirements" "200" "Store use case requirements"

# Test 3: Get requirements for 'bank' use case
echo -e "\n${YELLOW}=== Test 3: Get Requirements for Bank ===${NC}"
bank_requirements='{
    "did": "'$TEST_DID'",
    "useCase": "bank"
}'
test_endpoint "POST" "/api/getRequirements" "$bank_requirements" "200" "Bank use case requirements"

# Test 4: Get requirements for 'doctor' use case
echo -e "\n${YELLOW}=== Test 4: Get Requirements for Doctor ===${NC}"
doctor_requirements='{
    "did": "'$TEST_DID'",
    "useCase": "doctor"
}'
test_endpoint "POST" "/api/getRequirements" "$doctor_requirements" "200" "Doctor use case requirements"

# Test 5: Invalid use case
echo -e "\n${YELLOW}=== Test 5: Invalid Use Case ===${NC}"
invalid_requirements='{
    "did": "'$TEST_DID'",
    "useCase": "invalid_use_case"
}'
test_endpoint "POST" "/api/getRequirements" "$invalid_requirements" "200" "Invalid use case (should return default)"

# Test 6: Missing required fields
echo -e "\n${YELLOW}=== Test 6: Missing Required Fields ===${NC}"
incomplete_data='{
    "did": "'$TEST_DID'"
}'
test_endpoint "POST" "/api/getRequirements" "$incomplete_data" "400" "Missing useCase field"

# Test 7: Get VC for non-existent DID
echo -e "\n${YELLOW}=== Test 7: Get VC for Non-existent DID ===${NC}"
test_endpoint "GET" "/api/getVc?did=did:persona:nonexistent&templateId=proof-of-age" "" "404" "Non-existent DID"

# Test 8: Get VC with missing parameters
echo -e "\n${YELLOW}=== Test 8: Get VC with Missing Parameters ===${NC}"
test_endpoint "GET" "/api/getVc?did=$TEST_DID" "" "400" "Missing templateId parameter"

# Test 9: Get VC with empty parameters
echo -e "\n${YELLOW}=== Test 9: Get VC with Empty Parameters ===${NC}"
test_endpoint "GET" "/api/getVc?did=&templateId=" "" "400" "Empty parameters"

echo -e "\n${YELLOW}=== Test 10: Create Sample Credential First ===${NC}"
# First, create a DID and credential to test with
create_did_data='{
    "tx": {
        "body": {
            "messages": [{
                "@type": "/persona.did.v1.MsgCreateDid",
                "did_document": {
                    "id": "'$TEST_DID'",
                    "controller": "'$TEST_CONTROLLER'"
                }
            }]
        }
    }
}'
test_endpoint "POST" "/cosmos/tx/v1beta1/txs" "$create_did_data" "200" "Create test DID"

# Create a credential
create_credential_data='{
    "tx": {
        "body": {
            "messages": [{
                "@type": "/persona.vc.v1.MsgIssueCredential",
                "creator": "'$TEST_CONTROLLER'",
                "vc_data": "{\"id\":\"test-credential-123\",\"credentialSubject\":{\"templateId\":\"proof-of-age\",\"name\":\"Test User\",\"birthYear\":1990}}"
            }]
        }
    }
}'
test_endpoint "POST" "/cosmos/tx/v1beta1/txs" "$create_credential_data" "200" "Create test credential"

# Test 11: Get VC for existing credential
echo -e "\n${YELLOW}=== Test 11: Get VC for Existing Credential ===${NC}"
test_endpoint "GET" "/api/getVc?did=$TEST_DID&templateId=proof-of-age" "" "200" "Get existing credential"

# Test 12: Get VC for non-matching template
echo -e "\n${YELLOW}=== Test 12: Get VC for Non-matching Template ===${NC}"
test_endpoint "GET" "/api/getVc?did=$TEST_DID&templateId=employment-verification" "" "404" "Non-matching template"

# Summary
echo -e "\n${YELLOW}=========================================="
echo "🏁 Dynamic Verification Testing Complete"
echo -e "==========================================${NC}"

echo -e "\n${GREEN}All tests completed!${NC}"
echo "Check the output above for any failures marked with ❌"

# Test different use cases and their requirements
echo -e "\n${YELLOW}=== Testing All Use Cases ===${NC}"
use_cases=("store" "bar" "hotel" "doctor" "bank" "rental" "employer" "travel" "graduate_school" "investment")

for use_case in "${use_cases[@]}"; do
    echo -e "\n${YELLOW}Testing use case: $use_case${NC}"
    requirements_data='{
        "did": "'$TEST_DID'",
        "useCase": "'$use_case'"
    }'
    test_endpoint "POST" "/api/getRequirements" "$requirements_data" "200" "Use case: $use_case"
done

echo -e "\n${GREEN}✅ All use case tests completed!${NC}"