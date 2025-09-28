#!/bin/bash

# =================================================
# Microservices Architecture Deployment Test Script  
# =================================================

echo "🚀 Testing Cross-Chain DEX Microservices Architecture"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:8787"
TEST_RESULTS=()

# Function to test endpoint
test_endpoint() {
    local service=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    echo -e "${BLUE}Testing:${NC} $description"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL$endpoint" 2>/dev/null)
    status_code="${response: -3}"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Status: $status_code"
        TEST_RESULTS+=("✓ $service - $description")
    else
        echo -e "  ${RED}✗ FAIL${NC} - Status: $status_code (expected $expected_status)"
        TEST_RESULTS+=("✗ $service - $description")
        if [ -f /tmp/response.json ]; then
            echo "  Response: $(cat /tmp/response.json)"
        fi
    fi
    echo
}

# Test health endpoints for all microservices
echo -e "${YELLOW}Testing Microservices Health Endpoints${NC}"
echo "----------------------------------------"

test_endpoint "KEEPER" "/keeper/health" "200" "Keeper Service Health Check"
test_endpoint "FUNDER" "/funder/health" "200" "Funder Service Health Check"  
test_endpoint "INDEXER" "/indexer/health" "200" "Indexer Service Health Check"
test_endpoint "WATCHER" "/watcher/health" "200" "Watcher Service Health Check"
test_endpoint "QUOTER" "/quoter/health" "200" "Quoter Service Health Check"

# Test service-specific endpoints
echo -e "${YELLOW}Testing Service-Specific Endpoints${NC}"
echo "-----------------------------------"

# Keeper endpoints
test_endpoint "KEEPER" "/keeper/tasks" "200" "List Keeper Tasks"
test_endpoint "KEEPER" "/keeper/rebalancing/status" "200" "Rebalancing Status"

# Funder endpoints  
test_endpoint "FUNDER" "/funder/balances" "200" "List Funder Balances"
test_endpoint "FUNDER" "/funder/thresholds" "200" "List Funding Thresholds"

# Indexer endpoints
test_endpoint "INDEXER" "/indexer/sync-status" "200" "Blockchain Sync Status"
test_endpoint "INDEXER" "/indexer/events/recent" "200" "Recent Blockchain Events"

# Watcher endpoints
test_endpoint "WATCHER" "/watcher/metrics" "200" "System Metrics"
test_endpoint "WATCHER" "/watcher/alerts" "200" "Active Alerts"

# Quoter endpoints  
test_endpoint "QUOTER" "/quoter/price/ETH" "200" "Token Price Query"
test_endpoint "QUOTER" "/quoter/gas-prices" "200" "Gas Price Information"

# Test Prometheus metrics endpoint
echo -e "${YELLOW}Testing Monitoring Integration${NC}"  
echo "----------------------------------"
test_endpoint "MONITORING" "/metrics" "200" "Prometheus Metrics Endpoint"

# Summary
echo -e "${YELLOW}Test Summary${NC}"
echo "============"
passed=0
failed=0
for result in "${TEST_RESULTS[@]}"; do
    if [[ $result == "✓"* ]]; then
        echo -e "${GREEN}$result${NC}"
        ((passed++))
    elif [[ $result == "✗"* ]]; then
        echo -e "${RED}$result${NC}"
        ((failed++))
    else
        echo -e "${YELLOW}$result${NC}"
    fi
done

echo
echo -e "${BLUE}Results:${NC} $passed passed, $failed failed"

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Microservices architecture is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the microservices configuration.${NC}"
    exit 1
fi