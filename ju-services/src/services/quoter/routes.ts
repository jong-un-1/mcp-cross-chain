import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { QuoterService } from './quoter-service';
import type { Env, Token, ChainId } from '../../core/types';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS
app.use('*', cors({
  origin: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize service instance
let quoterService: QuoterService;

app.use('*', async (c, next) => {
  if (!quoterService) {
    quoterService = new QuoterService(c.env);
    await quoterService.initialize();
  }
  await next();
});

/**
 * GET /health - Health check
 */
app.get('/health', async (c) => {
  try {
    const health = await quoterService.healthCheck();
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
 * POST /quote - Get a quote for token swap
 * Body: {
 *   inputToken: Token,
 *   outputToken: Token,
 *   inputAmount: string,
 *   slippageTolerance?: number
 * }
 */
app.post('/quote', async (c) => {
  try {
    const { inputToken, outputToken, inputAmount, slippageTolerance } = await c.req.json();

    // Validate input
    if (!inputToken || !outputToken || !inputAmount) {
      return c.json({ 
        error: 'Missing required fields: inputToken, outputToken, inputAmount' 
      }, 400);
    }

    // Validate token format
    if (!isValidToken(inputToken) || !isValidToken(outputToken)) {
      return c.json({ 
        error: 'Invalid token format' 
      }, 400);
    }

    // Validate amount
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      return c.json({ 
        error: 'Invalid input amount' 
      }, 400);
    }

    // Validate slippage tolerance
    const slippage = slippageTolerance || 0.005;
    if (slippage < 0 || slippage > 1) {
      return c.json({ 
        error: 'Slippage tolerance must be between 0 and 1' 
      }, 400);
    }

    const quote = await quoterService.getQuote(
      inputToken,
      outputToken,
      inputAmount,
      slippage
    );

    return c.json({
      success: true,
      data: quote,
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
 * GET /gas-prices - Get current gas prices
 * Query: ?chainId=1 (optional)
 */
app.get('/gas-prices', async (c) => {
  try {
    const chainId = c.req.query('chainId');
    
    let chainIdEnum: ChainId | undefined;
    if (chainId) {
      chainIdEnum = parseInt(chainId) as ChainId;
      
      // Validate chainId
      const validChainIds = [1, 56, 137, 42161, 10]; // ETH, BSC, Polygon, Arbitrum, Optimism
      if (!validChainIds.includes(chainIdEnum)) {
        return c.json({ 
          error: 'Invalid chain ID. Supported chains: 1, 56, 137, 42161, 10' 
        }, 400);
      }
    }

    const gasPrices = await quoterService.getGasPrices(chainIdEnum);

    return c.json({
      success: true,
      data: gasPrices,
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
 * GET /liquidity - Get liquidity for token pair
 * Query: tokenA, tokenB, chainId
 */
app.get('/liquidity', async (c) => {
  try {
    const tokenAAddress = c.req.query('tokenA');
    const tokenBAddress = c.req.query('tokenB');
    const chainId = c.req.query('chainId');

    if (!tokenAAddress || !tokenBAddress || !chainId) {
      return c.json({ 
        error: 'Missing required parameters: tokenA, tokenB, chainId' 
      }, 400);
    }

    const chainIdEnum = parseInt(chainId) as ChainId;
    const validChainIds = [1, 56, 137, 42161, 10];
    if (!validChainIds.includes(chainIdEnum)) {
      return c.json({ 
        error: 'Invalid chain ID' 
      }, 400);
    }

    // Create basic token objects for liquidity check
    const tokenA: Token = {
      address: tokenAAddress,
      symbol: 'TOKENA',
      name: 'Token A',
      decimals: 18,
      chainId: chainIdEnum,
    };

    const tokenB: Token = {
      address: tokenBAddress,
      symbol: 'TOKENB',
      name: 'Token B',
      decimals: 18,
      chainId: chainIdEnum,
    };

    const liquidityPools = await quoterService.getLiquidity(tokenA, tokenB);

    return c.json({
      success: true,
      data: {
        tokenA: tokenAAddress,
        tokenB: tokenBAddress,
        chainId: chainIdEnum,
        pools: liquidityPools,
        hasLiquidity: liquidityPools.length > 0,
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
 * POST /check-liquidity - Check if swap is possible
 * Body: {
 *   inputToken: Token,
 *   outputToken: Token,
 *   inputAmount: string
 * }
 */
app.post('/check-liquidity', async (c) => {
  try {
    const { inputToken, outputToken, inputAmount } = await c.req.json();

    if (!inputToken || !outputToken || !inputAmount) {
      return c.json({ 
        error: 'Missing required fields: inputToken, outputToken, inputAmount' 
      }, 400);
    }

    if (!isValidToken(inputToken) || !isValidToken(outputToken)) {
      return c.json({ 
        error: 'Invalid token format' 
      }, 400);
    }

    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      return c.json({ 
        error: 'Invalid input amount' 
      }, 400);
    }

    const hasLiquidity = await quoterService.checkLiquidity(
      inputToken,
      outputToken,
      inputAmount
    );

    return c.json({
      success: true,
      data: {
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        inputAmount,
        hasLiquidity,
        swapPossible: hasLiquidity,
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
 * GET /tokens - Get supported tokens for a chain
 * Query: ?chainId=1
 */
app.get('/tokens', async (c) => {
  try {
    const chainId = c.req.query('chainId');
    
    if (!chainId) {
      return c.json({ 
        error: 'Missing chainId parameter' 
      }, 400);
    }

    const chainIdEnum = parseInt(chainId) as ChainId;
    const validChainIds = [1, 56, 137, 42161, 10];
    if (!validChainIds.includes(chainIdEnum)) {
      return c.json({ 
        error: 'Invalid chain ID. Supported chains: 1, 56, 137, 42161, 10' 
      }, 400);
    }

    const tokens = await quoterService.getSupportedTokens(chainIdEnum);

    return c.json({
      success: true,
      data: {
        chainId: chainIdEnum,
        tokens,
        count: tokens.length,
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
 * POST /update-prices - Manually trigger price feed update
 */
app.post('/update-prices', async (c) => {
  try {
    await quoterService.updatePriceFeeds();

    return c.json({
      success: true,
      message: 'Price feeds updated successfully',
      timestamp: Date.now(),
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
 * POST /update-gas-prices - Manually trigger gas price update
 */
app.post('/update-gas-prices', async (c) => {
  try {
    await quoterService.updateGasPrices();

    return c.json({
      success: true,
      message: 'Gas prices updated successfully',
      timestamp: Date.now(),
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
 * GET /stats - Get quoter service statistics
 */
app.get('/stats', async (c) => {
  try {
    const health = await quoterService.healthCheck();

    return c.json({
      success: true,
      data: {
        status: health.status,
        serviceName: quoterService.serviceName,
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

/**
 * Helper function to validate token structure
 */
function isValidToken(token: any): token is Token {
  return (
    token &&
    typeof token.address === 'string' &&
    typeof token.symbol === 'string' &&
    typeof token.name === 'string' &&
    typeof token.decimals === 'number' &&
    typeof token.chainId === 'number' &&
    token.address.length === 42 &&
    token.address.startsWith('0x') &&
    token.decimals >= 0 &&
    token.decimals <= 18
  );
}

export default app;