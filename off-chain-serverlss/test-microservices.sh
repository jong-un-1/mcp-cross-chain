#!/bin/bash

# Cross-Chain DEX Microservices Test Suite
# Tests all microservices and their endpoints

set -e

echo "🧪 Testing Cross-Chain DEX Microservices"
echo "========================================"

# Configuration
BASE_URL="${1:-http://localhost:8787}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test result tracking
test_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$actual" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        echo -e "${YELLOW}   Expected: ${NC}$expected"
        echo -e "${YELLOW}   Got:      ${NC}$actual"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# HTTP test helper
http_test() {
    local method="$1"
    local endpoint="$2"
    local expected="$3"
    local test_name="$4"
    local data="$5"
    
    echo -e "${BLUE}Testing:${NC} $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" || echo "ERROR\n500")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" || echo "ERROR\n500")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" || echo "ERROR\n500")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        test_result "$test_name" "$expected" "$response_body"
    else
        test_result "$test_name (HTTP $http_code)" "$expected" "HTTP_ERROR: $response_body"
    fi
}

echo -e "${BLUE}Base URL:${NC} $BASE_URL"
echo ""

# =============================================================================
# CORE API TESTS
# =============================================================================

echo -e "${YELLOW}Testing Core API Endpoints${NC}"
echo "------------------------"

# Test root endpoint
http_test "GET" "/" "Cross-Chain DEX Backend API" "Root endpoint"

# Test health check
http_test "GET" "/health" '"status":"ok"' "Health check"

echo ""

# =============================================================================
# KEEPER SERVICE TESTS
# =============================================================================

echo -e "${YELLOW}Testing Keeper Service${NC}"
echo "---------------------"

# Test keeper health
http_test "GET" "/v1/api/keeper/health" '"service":"keeper"' "Keeper health check"

# Test get scheduled tasks
http_test "GET" "/v1/api/keeper/tasks" '"success":true' "Get scheduled tasks"

# Test execute scheduled tasks
http_test "POST" "/v1/api/keeper/execute" '"success":true' "Execute scheduled tasks"

echo ""

# =============================================================================
# EXISTING SERVICES TESTS (Compatibility)
# =============================================================================

echo -e "${YELLOW}Testing Existing Services (Compatibility)${NC}"
echo "----------------------------------------"

# Test DEX service
http_test "GET" "/v1/api/dex/health" '"status":"ok"' "DEX service health" || true

# Test AI service  
http_test "GET" "/v1/api/ai/health" '"status":"ok"' "AI service health" || true

# Test storage service
http_test "GET" "/v1/api/storage/health" '"status":"ok"' "Storage service health" || true

# Test database service
http_test "GET" "/v1/api/database/health" '"status":"ok"' "Database service health" || true

# Test cache service
http_test "GET" "/v1/api/cache/health" '"status":"ok"' "Cache service health" || true

echo ""

# =============================================================================
# MICROSERVICES INTEGRATION TESTS
# =============================================================================

echo -e "${YELLOW}Testing Microservices Integration${NC}"
echo "--------------------------------"

# Test cron endpoint (should work without auth in test)
http_test "POST" "/cron/keeper" '"success":true' "Cron keeper execution" || true

# Test with different HTTP methods
echo -e "${BLUE}Testing:${NC} OPTIONS /health"
response=$(curl -s -X OPTIONS "$BASE_URL/health" -w "\n%{http_code}" || echo "ERROR\n500")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
    test_result "CORS OPTIONS request" "200" "$http_code"
else
    test_result "CORS OPTIONS request" "200" "HTTP_ERROR: $http_code"
fi

echo ""

# =============================================================================
# STRESS TESTS (Light)
# =============================================================================

echo -e "${YELLOW}Running Light Stress Tests${NC}"
echo "--------------------------"

echo "Testing concurrent requests to health endpoint..."
for i in {1..5}; do
    curl -s "$BASE_URL/health" > /dev/null &
done
wait

echo -e "${GREEN}✅${NC} Concurrent requests test completed"

echo ""

# =============================================================================
# ERROR HANDLING TESTS  
# =============================================================================

echo -e "${YELLOW}Testing Error Handling${NC}"
echo "---------------------"

# Test 404 endpoint
echo -e "${BLUE}Testing:${NC} GET /nonexistent"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/nonexistent")
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ "$http_code" = "404" ]; then
    test_result "404 handling" '"success":false' "$response_body"
else
    test_result "404 handling" "HTTP 404" "HTTP $http_code: $response_body"
fi

# Test invalid keeper task operation
http_test "POST" "/v1/api/keeper/tasks/invalid/pause" '"success":false' "Invalid task pause" || true

echo ""

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

echo -e "${YELLOW}Testing Performance${NC}"
echo "------------------"

# Measure response time for health check
echo -e "${BLUE}Measuring response times...${NC}"

start_time=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000)) # Convert to milliseconds

if [ $duration -lt 1000 ]; then # Less than 1 second
    echo -e "${GREEN}✅ PASS${NC} - Response time: ${duration}ms (< 1000ms)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} - Response time: ${duration}ms (>= 1000ms)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""

# =============================================================================
# MICROSERVICES SPECIFIC TESTS
# =============================================================================

echo -e "${YELLOW}Testing Microservices Architecture${NC}"
echo "---------------------------------"

# Test service discovery through root endpoint
response=$(curl -s "$BASE_URL/")
services=("keeper" "funder" "indexer" "watcher" "quoter")

for service in "${services[@]}"; do
    test_result "Service $service in architecture" "$service" "$response"
done

echo ""

# =============================================================================
# TEST SUMMARY
# =============================================================================

echo "========================================"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo "========================================"
echo -e "Total Tests: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "Passed:      ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:      ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    echo "Microservices architecture is working correctly."
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed.${NC}"
    echo "Please check the failed tests and fix the issues."
    echo ""
    echo "Common issues:"
    echo "1. Services not running - start with: wrangler dev"
    echo "2. Database not migrated - run: ./deploy-microservices.sh migrate"
    echo "3. Missing environment variables"
    echo "4. Port conflicts"
    exit 1
fi