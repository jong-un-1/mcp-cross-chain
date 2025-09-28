import { Hono } from 'hono';
import { IndexerService } from './indexer-service';
import type { Env, ChainId } from '../../core/types';

/**
 * Indexer Routes
 * Handles blockchain data indexing and retrieval
 */
export function createIndexerRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // Health check
  app.get('/health', async (c) => {
    try {
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      const health = await indexer.healthCheck();
      
      return c.json(health);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        service: 'indexer',
        status: 'unhealthy',
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Get sync status for all chains
  app.get('/status', async (c) => {
    try {
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      const statuses = await indexer.getAllChainStatuses();
      
      return c.json({
        success: true,
        data: statuses,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Get recent blockchain events
  app.get('/events', async (c) => {
    try {
      const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId') || '0') : undefined;
      const limit = parseInt(c.req.query('limit') || '100');
      
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      const events = await indexer.getRecentEvents(chainId, limit);
      
      return c.json({
        success: true,
        data: events,
        pagination: {
          limit,
          total: events.length,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Get events for a specific contract
  app.get('/events/contract/:address', async (c) => {
    try {
      const contractAddress = c.req.param('address');
      const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId') || '0') : undefined;
      const limit = parseInt(c.req.query('limit') || '100');
      
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      const events = await indexer.getEventsByContract(contractAddress, chainId, limit);
      
      return c.json({
        success: true,
        data: events,
        pagination: {
          limit,
          total: events.length,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Get user balances
  app.get('/balances/:address', async (c) => {
    try {
      const userAddress = c.req.param('address');
      const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId') || '0') : undefined;
      
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      const balances = await indexer.getUserBalances(userAddress, chainId);
      
      return c.json({
        success: true,
        data: balances,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Sync recent events (called by cron)
  app.post('/sync', async (c) => {
    try {
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      await indexer.syncRecentEvents();
      
      return c.json({
        success: true,
        message: 'Recent events sync completed',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Start indexing for a specific chain
  app.post('/start/:chainId', async (c) => {
    try {
      const chainId = parseInt(c.req.param('chainId'));
      
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      await indexer.startIndexingForChain(chainId as ChainId);
      
      return c.json({
        success: true,
        message: `Indexing started for chain ${chainId}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Stop indexing for a specific chain
  app.post('/stop/:chainId', async (c) => {
    try {
      const chainId = parseInt(c.req.param('chainId'));
      
      const indexer = new IndexerService(c.env);
      await indexer.initialize();
      
      await indexer.stopIndexingForChain(chainId as ChainId);
      
      return c.json({
        success: true,
        message: `Indexing stopped for chain ${chainId}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  return app;
}

// Create and export default instance
const indexerRoutes = createIndexerRoutes();
export default indexerRoutes;