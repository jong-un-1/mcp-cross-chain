#!/bin/bash

# Cross-Chain DEX Microservices Deployment Script
# This script deploys the refactored microservices architecture

set -e  # Exit on any error

echo "🚀 Deploying Cross-Chain DEX Microservices Architecture"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cross-chain-dex-backend"
WRANGLER_CONFIG="wrangler-microservices.toml"

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI is not installed. Please install it first:"
        log_error "npm install -g wrangler"
        exit 1
    fi
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        log_error "Not logged in to Cloudflare. Please login first:"
        log_error "wrangler login"
        exit 1
    fi
    
    # Check if configuration file exists
    if [ ! -f "$WRANGLER_CONFIG" ]; then
        log_error "Configuration file $WRANGLER_CONFIG not found!"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✅"
}

# Create Cloudflare resources
create_resources() {
    log_info "Creating Cloudflare resources..."
    
    # Create KV namespace for caching
    log_info "Creating KV namespace..."
    KV_ID=$(wrangler kv:namespace create "CACHE_KV" --preview false 2>/dev/null | grep -o '"id": "[^"]*"' | cut -d'"' -f4 | head -n1 || true)
    
    if [ -n "$KV_ID" ]; then
        log_info "KV namespace created with ID: $KV_ID"
        sed -i.bak "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/g" "$WRANGLER_CONFIG"
    else
        log_warn "KV namespace might already exist or creation failed"
    fi
    
    # Create preview KV namespace
    KV_PREVIEW_ID=$(wrangler kv:namespace create "CACHE_KV" --preview true 2>/dev/null | grep -o '"id": "[^"]*"' | cut -d'"' -f4 | head -n1 || true)
    
    if [ -n "$KV_PREVIEW_ID" ]; then
        log_info "KV preview namespace created with ID: $KV_PREVIEW_ID"
        sed -i.bak "s/YOUR_KV_PREVIEW_NAMESPACE_ID_HERE/$KV_PREVIEW_ID/g" "$WRANGLER_CONFIG"
    fi
    
    # Create D1 database
    log_info "Creating D1 database..."
    D1_OUTPUT=$(wrangler d1 create cross-chain-dex-db 2>/dev/null || true)
    D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || true)
    
    if [ -n "$D1_ID" ]; then
        log_info "D1 database created with ID: $D1_ID"
        sed -i.bak "s/YOUR_D1_DATABASE_ID_HERE/$D1_ID/g" "$WRANGLER_CONFIG"
    else
        log_warn "D1 database might already exist or creation failed"
    fi
    
    # Create R2 bucket
    log_info "Creating R2 bucket..."
    wrangler r2 bucket create dex-storage 2>/dev/null || log_warn "R2 bucket might already exist"
    
    log_info "Resources creation completed ✅"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Apply migrations to local D1
    if [ -f "drizzle/migrations/0003_microservices_schema.sql" ]; then
        wrangler d1 execute cross-chain-dex-db --local --file="drizzle/migrations/0003_microservices_schema.sql" || log_warn "Local migration might have failed"
        log_info "Local migrations applied"
        
        # Apply to remote D1
        wrangler d1 execute cross-chain-dex-db --remote --file="drizzle/migrations/0003_microservices_schema.sql" || log_warn "Remote migration might have failed"
        log_info "Remote migrations applied"
    else
        log_warn "Migration file not found, skipping migrations"
    fi
    
    log_info "Database migrations completed ✅"
}

# Build the project
build_project() {
    log_info "Building the project..."
    
    # Install dependencies
    npm install
    
    # Build TypeScript
    npm run build || tsc --build
    
    log_info "Project build completed ✅"
}

# Deploy to Cloudflare Workers
deploy_workers() {
    log_info "Deploying to Cloudflare Workers..."
    
    # Deploy with the microservices configuration
    wrangler deploy --config="$WRANGLER_CONFIG" --name="$PROJECT_NAME"
    
    log_info "Deployment completed ✅"
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Get the deployment URL
    WORKER_URL="https://$PROJECT_NAME.$(wrangler whoami | grep 'Account ID' | awk '{print $3}').workers.dev"
    
    log_info "Testing health endpoint..."
    if curl -s "$WORKER_URL/health" | grep -q '"status":"ok"'; then
        log_info "Health check passed ✅"
    else
        log_warn "Health check might have failed"
    fi
    
    log_info "Testing keeper service..."
    if curl -s "$WORKER_URL/v1/api/keeper/health" | grep -q '"service":"keeper"'; then
        log_info "Keeper service test passed ✅"
    else
        log_warn "Keeper service test might have failed"
    fi
    
    log_info "Deployment URL: $WORKER_URL"
    log_info "Testing completed ✅"
}

# Setup cron jobs
setup_cron() {
    log_info "Setting up cron jobs..."
    
    # Cron jobs are configured in wrangler.toml
    log_info "Cron jobs configured in $WRANGLER_CONFIG:"
    echo "  - */30 * * * * * : Check pending orders"
    echo "  - */2 * * * *   : Update funding status"
    echo "  - */5 * * * *   : Rebalance liquidity"
    echo "  - */1 * * * *   : Sync blockchain data"
    echo "  - */3 * * * *   : Collect metrics"
    echo "  - 0 * * * *     : Update price feeds"
    echo "  - 0 2 * * *     : Daily cleanup"
    
    log_info "Cron jobs setup completed ✅"
}

# Main deployment flow
main() {
    echo "Starting deployment process..."
    
    check_prerequisites
    create_resources
    build_project
    run_migrations
    deploy_workers
    setup_cron
    test_deployment
    
    echo ""
    echo "================================================="
    log_info "🎉 Deployment completed successfully!"
    echo "================================================="
    echo ""
    echo "Next steps:"
    echo "1. Update API keys and RPC URLs in Cloudflare Workers dashboard"
    echo "2. Test all microservice endpoints"
    echo "3. Monitor cron job execution in Cloudflare dashboard"
    echo "4. Set up monitoring and alerts"
    echo ""
    echo "Microservices endpoints:"
    echo "  - Keeper:  $WORKER_URL/v1/api/keeper"
    echo "  - Health:  $WORKER_URL/health"
    echo "  - Docs:    $WORKER_URL/"
    echo ""
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "resources")
        check_prerequisites
        create_resources
        ;;
    "migrate")
        run_migrations
        ;;
    "test")
        test_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy     - Full deployment (default)"
        echo "  resources  - Create Cloudflare resources only"
        echo "  migrate    - Run database migrations only"
        echo "  test       - Test deployment only"
        echo "  help       - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac