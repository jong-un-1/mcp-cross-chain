import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FunderService } from './funder-service';
import type { Env, ChainId } from '../../core/types';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS
app.use('*', cors({
  origin: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize service instance
let funderService: FunderService;

app.use('*', async (c, next) => {
  if (!funderService) {
    funderService = new FunderService(c.env);
    await funderService.initialize();
  }
  await next();
});

/**
 * GET /health - Health check
 */
app.get('/health', async (c) => {
  try {
    const health = await funderService.healthCheck();
    return c.json(health, health.status === 'healthy' ? 200 : 503);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      status: 'error', 
      message: errorMessage 
    }, 500);
  }
});

/**
 * GET /balances - Get all balances across chains
 * Query: ?address=0x123 (optional to filter by specific address)
 */
app.get('/balances', async (c) => {
  try {
    const address = c.req.query('address');
    
    let balances;
    if (address) {
      // Validate address format
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return c.json({ 
          error: 'Invalid address format' 
        }, 400);
      }
      
      balances = await funderService.getBalancesForAddress(address);
    } else {
      balances = await funderService.getAllBalances();
    }

    return c.json({
      success: true,
      data: balances,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * GET /balances/:chainId/:address - Get specific balance
 */
app.get('/balances/:chainId/:address', async (c) => {
  try {
    const chainId = parseInt(c.req.param('chainId')) as ChainId;
    const address = c.req.param('address');

    // Validate chainId
    const validChainIds = [1, 56, 137, 42161, 10]; // ETH, BSC, Polygon, Arbitrum, Optimism
    if (!validChainIds.includes(chainId)) {
      return c.json({ 
        error: 'Invalid chain ID. Supported chains: 1, 56, 137, 42161, 10' 
      }, 400);
    }

    // Validate address
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ 
        error: 'Invalid address format' 
      }, 400);
    }

    const balance = await funderService.getBalance(chainId, address);

    return c.json({
      success: true,
      data: {
        chainId,
        address,
        balance: balance.toString(),
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * POST /fund - Fund an address
 * Body: {
 *   chainId: number,
 *   address: string,
 *   amount: string
 * }
 */
app.post('/fund', async (c) => {
  try {
    const { chainId, address, amount } = await c.req.json();

    // Validate input
    if (!chainId || !address || !amount) {
      return c.json({ 
        error: 'Missing required fields: chainId, address, amount' 
      }, 400);
    }

    // Validate chainId
    const validChainIds = [1, 56, 137, 42161, 10];
    if (!validChainIds.includes(chainId)) {
      return c.json({ 
        error: 'Invalid chain ID' 
      }, 400);
    }

    // Validate address
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ 
        error: 'Invalid address format' 
      }, 400);
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return c.json({ 
        error: 'Invalid amount' 
      }, 400);
    }

    const result = await funderService.fundAddress(chainId, address, amount);

    return c.json({
      success: true,
      data: result,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * POST /fund/auto - Trigger automatic funding based on thresholds
 * Body: {
 *   chainId?: number (optional, fund all chains if not provided)
 * }
 */
app.post('/fund/auto', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { chainId } = body;

    let result;
    if (chainId) {
      // Validate chainId
      const validChainIds = [1, 56, 137, 42161, 10];
      if (!validChainIds.includes(chainId)) {
        return c.json({ 
          error: 'Invalid chain ID' 
        }, 400);
      }
      
      result = await funderService.checkAndFundChain(chainId);
    } else {
      result = await funderService.checkAndFundAllChains();
    }

    return c.json({
      success: true,
      data: result,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * POST /thresholds - Set funding thresholds
 * Body: {
 *   chainId: number,
 *   threshold: string,
 *   topUp: string
 * }
 */
app.post('/thresholds', async (c) => {
  try {
    const { chainId, threshold, topUp } = await c.req.json();

    if (!chainId || !threshold || !topUp) {
      return c.json({ 
        error: 'Missing required fields: chainId, threshold, topUp' 
      }, 400);
    }

    // Validate chainId
    const validChainIds = [1, 56, 137, 42161, 10];
    if (!validChainIds.includes(chainId)) {
      return c.json({ 
        error: 'Invalid chain ID' 
      }, 400);
    }

    // Validate amounts
    const thresholdNum = parseFloat(threshold);
    const topUpNum = parseFloat(topUp);
    
    if (isNaN(thresholdNum) || isNaN(topUpNum) || thresholdNum < 0 || topUpNum <= 0) {
      return c.json({ 
        error: 'Invalid threshold or topUp amount' 
      }, 400);
    }

    if (topUpNum <= thresholdNum) {
      return c.json({ 
        error: 'TopUp amount must be greater than threshold' 
      }, 400);
    }

    await funderService.setFundingThreshold(chainId, threshold, topUp);

    return c.json({
      success: true,
      message: 'Funding threshold updated successfully',
      data: {
        chainId,
        threshold,
        topUp,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * GET /thresholds - Get funding thresholds
 * Query: ?chainId=1 (optional)
 */
app.get('/thresholds', async (c) => {
  try {
    const chainId = c.req.query('chainId');
    
    let thresholds;
    if (chainId) {
      const chainIdNum = parseInt(chainId) as ChainId;
      const validChainIds = [1, 56, 137, 42161, 10];
      if (!validChainIds.includes(chainIdNum)) {
        return c.json({ 
          error: 'Invalid chain ID' 
        }, 400);
      }
      
      thresholds = await funderService.getFundingThreshold(chainIdNum);
      
      return c.json({
        success: true,
        data: {
          chainId: chainIdNum,
          ...thresholds,
        },
      });
    } else {
      thresholds = await funderService.getAllFundingThresholds();
      
      return c.json({
        success: true,
        data: thresholds,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * POST /permit2 - Generate Permit2 data
 * Body: {
 *   chainId: number,
 *   token: string,
 *   spender: string,
 *   amount: string,
 *   deadline?: number
 * }
 */
app.post('/permit2', async (c) => {
  try {
    const { chainId, token, spender, amount, deadline } = await c.req.json();

    if (!chainId || !token || !spender || !amount) {
      return c.json({ 
        error: 'Missing required fields: chainId, token, spender, amount' 
      }, 400);
    }

    // Validate addresses
    if (!token.match(/^0x[a-fA-F0-9]{40}$/) || !spender.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ 
        error: 'Invalid token or spender address format' 
      }, 400);
    }

    // Validate chainId
    const validChainIds = [1, 56, 137, 42161, 10];
    if (!validChainIds.includes(chainId)) {
      return c.json({ 
        error: 'Invalid chain ID' 
      }, 400);
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return c.json({ 
        error: 'Invalid amount' 
      }, 400);
    }

    const permit2Data = await funderService.buildPermit2Data(
      chainId,
      token,
      spender,
      amount,
      deadline
    );

    return c.json({
      success: true,
      data: permit2Data,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

/**
 * GET /stats - Get funder service statistics
 */
app.get('/stats', async (c) => {
  try {
    const health = await funderService.healthCheck();

    return c.json({
      success: true,
      data: {
        status: health.status,
        serviceName: funderService.serviceName,
        timestamp: health.timestamp,
        details: health.details,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      success: false,
      error: errorMessage 
    }, 500);
  }
});

export default app;