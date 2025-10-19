import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import all microservices routes  
import keeperApp from './services/keeper/routes';
import funderApp from './services/funder/routes';
import indexerApp from './services/indexer/routes';
import watcherApp from './services/watcher/routes';
import quoterApp from './services/quoter/routes';

// Define the Env interface for this file
interface MicroservicesEnv {
  // Cloudflare bindings
  DEFI_DB: D1Database;
  DEFI_KV: KVNamespace;
  DEFI_R2: R2Bucket;
  
  // API keys for external services
  CHAINBASE_API_KEY?: string;
  TENDERLY_API_KEY?: string;
  CODEX_API_KEY?: string;
  ACROSS_API_KEY?: string;
  MESON_API_KEY?: string;
  CELER_API_KEY?: string;
  STARGATE_API_KEY?: string;
  WORMHOLE_API_KEY?: string;
  CCTP_API_KEY?: string;
  
  // Environment config
  ENVIRONMENT?: string;
  LOG_LEVEL?: string;
  
  // Cross-chain configuration
  SUPPORTED_CHAINS?: string;
  DEFAULT_SLIPPAGE?: string;
  MAX_GAS_PRICE?: string;
  
  // Lit Network configuration
  LIT_NETWORK?: string;
  LIT_PRIVATE_KEY?: string;
}

const app = new Hono<{ 
  Bindings: MicroservicesEnv;
  Variables: {
    requestId: string;
  };
}>();

// Apply global middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Add request ID and timing middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  c.set('requestId', requestId);
  c.res.headers.set('X-Request-ID', requestId);
  c.res.headers.set('X-Powered-By', 'JU Cross-Chain Microservices');
  
  await next();
  
  const duration = Date.now() - startTime;
  c.res.headers.set('X-Response-Time', `${duration}ms`);
});

/**
 * Root endpoint - service information
 */
app.get('/', (c) => {
  return c.json({
    name: 'JU Cross-Chain Microservices',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    description: 'Complete microservices architecture for cross-chain DEX operations',
    services: [
      'keeper - Automated scheduling and liquidity rebalancing',
      'funder - Multi-chain address funding and balance monitoring', 
      'indexer - Blockchain event indexing and data sync',
      'watcher - System monitoring and alerting',
      'quoter - Price discovery and trading execution',
    ],
    architecture: {
      platform: 'Cloudflare Workers',
      framework: 'Hono.js',
      language: 'TypeScript',
      pattern: 'microservices',
    },
  });
});

/**
 * Global health check for all services
 */
app.get('/health', async (c) => {
  try {
    const services = ['keeper', 'funder', 'indexer', 'watcher', 'quoter'];

    const results = services.map(service => ({
      service,
      status: 'healthy',
      endpoint: `/${service}/health`,
    }));

    const allHealthy = results.every(result => result.status === 'healthy');

    return c.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        unhealthy: results.filter(r => r.status !== 'healthy').length,
      },
    }, allHealthy ? 200 : 503);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      status: 'error',
      message: 'Failed to check service health',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

/**
 * API documentation endpoint
 */
app.get('/docs', (c) => {
  return c.json({
    title: 'JU Cross-Chain Microservices API',
    version: '1.0.0',
    description: 'RESTful API for cross-chain DEX operations',
    baseUrl: c.req.url.replace(/\/docs$/, ''),
    services: {
      keeper: {
        description: 'Automated scheduling, liquidity rebalancing, order processing',
        baseUrl: '/keeper',
        endpoints: [
          'GET /health - Health check',
          'POST /tasks - Create scheduled task',
          'GET /tasks - List tasks',
          'DELETE /tasks/:id - Cancel task',
          'POST /rebalance - Trigger liquidity rebalancing',
          'POST /lit-actions - Execute Lit Actions',
          'GET /stats - Service statistics',
        ],
      },
      funder: {
        description: 'Multi-chain address funding and balance monitoring',
        baseUrl: '/funder',
        endpoints: [
          'GET /health - Health check',
          'GET /balances - Get balances across chains',
          'GET /balances/:chainId/:address - Get specific balance',
          'POST /fund - Fund an address',
          'POST /fund/auto - Auto-fund based on thresholds',
          'POST /thresholds - Set funding thresholds',
          'GET /thresholds - Get funding thresholds',
          'POST /permit2 - Generate Permit2 data',
          'GET /stats - Service statistics',
        ],
      },
      indexer: {
        description: 'Blockchain event indexing and real-time data synchronization',
        baseUrl: '/indexer',
        endpoints: [
          'GET /health - Health check',
          'GET /events - Get indexed events',
          'GET /events/:chainId - Get events for chain',
          'POST /sync - Trigger manual sync',
          'GET /sync/status - Get sync status',
          'GET /balances/:address - Get user balances',
          'POST /webhook - Webhook for real-time events',
          'GET /stats - Service statistics',
        ],
      },
      watcher: {
        description: 'System monitoring, Prometheus integration, and alerting',
        baseUrl: '/watcher',
        endpoints: [
          'GET /health - Health check',
          'GET /metrics - Prometheus metrics',
          'POST /metrics - Record custom metric',
          'GET /alerts - Get active alerts',
          'POST /alerts - Create alert rule',
          'DELETE /alerts/:id - Delete alert rule',
          'GET /alerts/:id - Get alert details',
          'GET /stats - Service statistics',
        ],
      },
      quoter: {
        description: 'Price discovery, liquidity analysis, and trading execution',
        baseUrl: '/quoter',
        endpoints: [
          'GET /health - Health check',
          'POST /quote - Get swap quote',
          'GET /gas-prices - Get current gas prices',
          'GET /liquidity - Check token pair liquidity',
          'POST /check-liquidity - Validate swap possibility',
          'GET /tokens - Get supported tokens',
          'POST /update-prices - Update price feeds',
          'POST /update-gas-prices - Update gas prices',
          'GET /stats - Service statistics',
        ],
      },
    },
    architecture: {
      platform: 'Cloudflare Workers',
      framework: 'Hono.js',
      language: 'TypeScript',
      databases: ['D1 (SQLite)', 'KV (Redis-like)', 'R2 (Object Storage)'],
      monitoring: 'Prometheus + Custom Metrics',
      chains: ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana'],
    },
    usage: {
      authentication: 'Optional Bearer token for rate limiting',
      rateLimit: '1000 requests per minute per IP',
      contentType: 'application/json',
      cors: 'Enabled for all origins',
    },
  });
});

/**
 * Service status summary
 */
app.get('/status', async (c) => {
  const timestamp = new Date().toISOString();
  
  return c.json({
    system: 'JU Cross-Chain DEX',
    status: 'operational',
    timestamp,
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'production',
    region: (c as any).cf?.colo || 'unknown',
    services: {
      keeper: { status: 'active', description: 'Task scheduling and automation' },
      funder: { status: 'active', description: 'Cross-chain funding management' },
      indexer: { status: 'active', description: 'Blockchain data indexing' },
      watcher: { status: 'active', description: 'System monitoring and alerts' },
      quoter: { status: 'active', description: 'Price discovery and quotes' },
    },
    capabilities: [
      'Cross-chain token swaps',
      'Automated liquidity rebalancing', 
      'Real-time price discovery',
      'Multi-chain balance monitoring',
      'Blockchain event indexing',
      'System health monitoring',
      'Automated order execution',
    ],
    metrics: {
      totalRequests: 'Available at /watcher/metrics',
      systemHealth: 'Available at /health',
      serviceMetrics: 'Available at each service /stats endpoint',
    },
  });
});

// Mount all microservice routes
app.route('/keeper', keeperApp);
app.route('/funder', funderApp);
app.route('/indexer', indexerApp);
app.route('/watcher', watcherApp);
app.route('/quoter', quoterApp);

// Global error handler
app.onError((error, c) => {
  console.error('Unhandled error:', error);
  
  const requestId = c.get('requestId') || 'unknown';
  
  return c.json({
    error: 'Internal server error',
    message: error.message,
    requestId,
    timestamp: new Date().toISOString(),
    service: 'microservices-gateway',
  }, 500);
});

// 404 handler
app.notFound((c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  return c.json({
    error: 'Not found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
    requestId,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation at /docs',
    availableRoutes: [
      'GET / - System information',
      'GET /health - Global health check',
      'GET /docs - API documentation',
      'GET /status - Service status',
      '/keeper/* - Keeper service endpoints',
      '/funder/* - Funder service endpoints',
      '/indexer/* - Indexer service endpoints',
      '/watcher/* - Watcher service endpoints',
      '/quoter/* - Quoter service endpoints',
    ],
  }, 404);
});

// Export the app as the default worker
export default app;