# 🚀 Cross-Chain DEX Microservices - Setup Guide

Complete setup guide for deploying the Cross-Chain DEX microservices architecture on Cloudflare Workers.

## 📋 Prerequisites

- **Node.js 18+** installed
- **Cloudflare account** with the following enabled:
  - Workers (Paid plan recommended for production)
  - D1 Database
  - KV Storage  
  - R2 Object Storage
- **Wrangler CLI** installed and authenticated
- **Git** for version control

## 🛠️ Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ju-services

# Install dependencies
npm install

# Install Wrangler CLI globally (if not installed)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### 2. Cloudflare Configuration

#### Get Your Account ID
```bash
# Get your Cloudflare account ID
wrangler whoami
```

#### Create Required Resources
```bash
# Create D1 database for microservices
wrangler d1 create cross-chain-dex-db

# Create KV namespace for caching
npm run setup-kv

# Create R2 bucket for storage (optional)
wrangler r2 bucket create defi-storage
```

### 3. Configure wrangler.toml

```bash
# Copy example configuration
cp wrangler.example.toml wrangler.toml
```

Edit `wrangler.toml` with your actual values:

```toml
name = "cross-chain-dex-microservices"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Replace with your account ID
account_id = "your-account-id-here"

[env.production]
# Production environment variables
[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"
ENABLE_METRICS = "true"

# Database binding - replace with your database ID
[[env.production.d1_databases]]
binding = "DEFI_DB"
database_name = "cross-chain-dex-db" 
database_id = "your-database-id-here"

# KV binding - replace with your KV namespace ID
[[env.production.kv_namespaces]]
binding = "DEFI_KV"
id = "your-kv-namespace-id-here"

# R2 binding - replace with your bucket name
[[env.production.r2_buckets]]
binding = "DEFI_R2"
bucket_name = "defi-storage"

# Cron triggers for microservices
[env.production.triggers]
crons = [
  "*/5 * * * *",    # Keeper: every 5 minutes
  "* * * * *",      # Funder: every minute
  "*/30 * * * * *", # Indexer: every 30 seconds
  "*/2 * * * *",    # Watcher: every 2 minutes  
  "*/10 * * * *"    # Quoter: every 10 minutes
]

# Development environment (same structure but with preview IDs)
[env.development]
[env.development.vars]
ENVIRONMENT = "development"
LOG_LEVEL = "debug"
ENABLE_METRICS = "true"

[[env.development.d1_databases]]
binding = "DEFI_DB"
database_name = "cross-chain-dex-db"
database_id = "your-database-id-here"

[[env.development.kv_namespaces]]
binding = "DEFI_KV"
preview_id = "your-preview-kv-id-here"
```

### 4. Database Setup

#### Apply Database Schema
```bash
# Apply migrations to local database
wrangler d1 migrations apply cross-chain-dex-db --local

# Apply to production database  
wrangler d1 migrations apply cross-chain-dex-db --remote
```

#### Initialize Database
```bash
# Run initialization script
wrangler d1 execute cross-chain-dex-db --local --file=drizzle/0002_init_microservices.sql

# For production
wrangler d1 execute cross-chain-dex-db --remote --file=drizzle/0002_init_microservices.sql
```

### 5. Verify Configuration

```bash
# Run configuration verification
./scripts/verify-config.sh

# Test local deployment
npm run dev
```

### 6. Test Microservices

```bash
# Make the test script executable
chmod +x test-deployment.sh

# Run comprehensive tests
./test-deployment.sh
```

Expected output:
```
🚀 Testing Cross-Chain DEX Microservices Architecture
==============================================

✓ KEEPER - Keeper Service Health Check
✓ FUNDER - Funder Service Health Check  
✓ INDEXER - Indexer Service Health Check
✓ WATCHER - Watcher Service Health Check
✓ QUOTER - Quoter Service Health Check
```

### 7. Deploy to Production

```bash
# Deploy all microservices
npm run deploy

# Or deploy to specific environment
npm run development  # for dev environment
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Deployment environment | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `ENABLE_METRICS` | Enable Prometheus metrics | `true` |

### Service Configuration

Each microservice can be configured individually:

```typescript
// src/core/config.ts
export const CONFIG = {
  keeper: {
    rebalanceInterval: 300000, // 5 minutes
    maxRetries: 3,
  },
  funder: {
    checkInterval: 60000, // 1 minute  
    defaultGasLimit: 21000,
  },
  indexer: {
    syncInterval: 30000, // 30 seconds
    batchSize: 100,
  },
  watcher: {
    metricsRetention: 86400000, // 24 hours
    alertThreshold: 0.95,
  },
  quoter: {
    priceUpdateInterval: 60000, // 1 minute
    maxSlippage: 0.05, // 5%
  }
};
```

## 🧪 Testing Setup

### Local Testing
```bash
# Start local development server
npm run dev

# In another terminal, run tests
npm test
npm run test:integration
```

### Production Testing
```bash
# Test production deployment
./test-deployment.sh

# Monitor logs
./scripts/view-logs.sh production
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database exists
   wrangler d1 list
   
   # Verify migrations
   wrangler d1 migrations list cross-chain-dex-db
   ```

2. **KV Namespace Not Found**
   ```bash
   # List KV namespaces
   wrangler kv namespace list
   
   # Re-run setup if needed
   npm run setup-kv
   ```

3. **Cron Jobs Not Triggering**
   ```bash
   # Check cron configuration
   wrangler cron trigger --cron "*/5 * * * *"
   ```

4. **High Response Times**
   - Check region deployment
   - Verify database indexes
   - Review cache configuration

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# View detailed logs
./scripts/view-logs.sh development --debug
```

## 📊 Monitoring Setup

### Prometheus Metrics

Access metrics at: `https://your-worker.workers.dev/metrics`

Key metrics to monitor:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Response times
- `db_query_duration_seconds` - Database performance
- `cache_hit_ratio` - Cache efficiency

### Alerting

Configure alerts via the Watcher service:

```bash
# Create alert rule
curl -X POST https://your-worker.workers.dev/watcher/alerts/rules \
  -H "Content-Type: application/json" \
  -d '{
    "ruleName": "High Error Rate",
    "metricName": "http_requests_total", 
    "conditionOperator": ">",
    "thresholdValue": 100,
    "severity": "critical"
  }'
```

## 🔐 Security Checklist

- [ ] API keys properly configured
- [ ] CORS settings appropriate for your domain
- [ ] Rate limiting enabled
- [ ] Database credentials secured
- [ ] Environment variables not exposed
- [ ] Audit logs enabled

## 📈 Performance Optimization

### Database
- Ensure proper indexes exist
- Monitor query performance
- Use prepared statements

### Caching  
- Configure appropriate TTL values
- Monitor cache hit rates
- Implement cache warming

### Network
- Use Cloudflare's global network
- Enable compression
- Optimize payload sizes

## 🎯 Next Steps

1. **Custom Domain**: Set up custom domain for production
2. **Monitoring**: Configure external monitoring (Pingdom, etc.)
3. **Backup**: Set up automated database backups
4. **CI/CD**: Implement automated deployments
5. **Documentation**: Create API documentation

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Microservices Architecture Guide](./README-MICROSERVICES.md)
- [API Reference](./docs/API_REFERENCE.md)

---

🎉 **Congratulations!** Your Cross-Chain DEX microservices are now ready for production use.