import { BaseService } from '../../core/base-service';
import type { 
  Env, 
  Quote, 
  Token, 
  SwapRoute, 
  PriceSource, 
  GasPrice,
  LiquidityPool
} from '../../core/types';
import { ChainId } from '../../core/types';

/**
 * Quoter Service
 * 
 * Responsibilities:
 * - Calculates order fees
 * - Fetches token prices from Codex, Tenderly, Ethers
 * - Calculates expected swap amounts
 * - Ensures liquidity exists to fulfill an order
 * - Generates Tx data for an order
 * - Estimates swap amounts
 * - Factors in all operations needed to fulfill order and returns a quote
 */
export class QuoterService extends BaseService {
  private priceCache: Map<string, PriceSource[]> = new Map();
  private gasPriceCache: Map<ChainId, GasPrice> = new Map();
  private liquidityPools: Map<string, LiquidityPool[]> = new Map();

  constructor(env: Env) {
    super(env);
  }

  get serviceName(): string {
    return 'quoter';
  }

  protected async onInitialize(): Promise<void> {
    await this.loadLiquidityPools();
    await this.updatePriceFeeds();
    await this.updateGasPrices();
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    const priceSourcesCount = Array.from(this.priceCache.values())
      .reduce((total, sources) => total + sources.length, 0);
    
    const supportedChains = Array.from(this.gasPriceCache.keys()).length;
    const liquidityPoolsCount = Array.from(this.liquidityPools.values())
      .reduce((total, pools) => total + pools.length, 0);

    return {
      priceSourcesActive: priceSourcesCount,
      supportedChains,
      liquidityPoolsLoaded: liquidityPoolsCount,
      cacheStatus: {
        prices: this.priceCache.size,
        gasPrices: this.gasPriceCache.size,
        liquidityPools: this.liquidityPools.size,
      },
    };
  }

  /**
   * Get a quote for a token swap
   */
  async getQuote(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string,
    slippageTolerance: number = 0.005 // 0.5% default
  ): Promise<Quote> {
    try {
      this.logger.info('Getting quote', {
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        inputAmount,
        slippageTolerance,
      });

      // 1. Find the best swap route
      const route = await this.findBestRoute(inputToken, outputToken, inputAmount);
      
      // 2. Calculate output amount with slippage
      const outputAmount = await this.calculateOutputAmount(route, inputAmount, slippageTolerance);
      
      // 3. Calculate price impact
      const priceImpact = await this.calculatePriceImpact(inputToken, outputToken, inputAmount, outputAmount);
      
      // 4. Calculate fees
      const fee = await this.calculateFees(inputToken, outputToken, inputAmount);
      
      // 5. Estimate gas cost
      const gasEstimate = await this.estimateGasCost(inputToken.chainId, route);

      const quote: Quote = {
        inputToken,
        outputToken,
        inputAmount,
        outputAmount,
        priceImpact,
        fee,
        gasEstimate,
        route,
      };

      this.logger.info('Quote generated', {
        outputAmount,
        priceImpact,
        fee,
        gasEstimate,
      });

      return quote;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get quote', {
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Find the best route for a swap
   */
  private async findBestRoute(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string
  ): Promise<SwapRoute[]> {
    const chainPools = this.liquidityPools.get(inputToken.chainId.toString()) || [];
    
    // For cross-chain swaps, we might need multiple hops
    if (inputToken.chainId !== outputToken.chainId) {
      return await this.findCrossChainRoute(inputToken, outputToken, inputAmount);
    }

    // Find direct pair
    const directPool = chainPools.find(pool => 
      (pool.token0.address === inputToken.address && pool.token1.address === outputToken.address) ||
      (pool.token1.address === inputToken.address && pool.token0.address === outputToken.address)
    );

    if (directPool) {
      const outputAmount = await this.calculatePoolOutputAmount(directPool, inputToken, inputAmount);
      
      return [{
        protocol: 'uniswap-v2', // This would be determined by the pool
        pool: directPool.address,
        tokenIn: inputToken,
        tokenOut: outputToken,
        amountIn: inputAmount,
        amountOut: outputAmount,
      }];
    }

    // Find route through intermediate tokens (e.g., WETH, USDC)
    return await this.findMultiHopRoute(inputToken, outputToken, inputAmount, chainPools);
  }

  /**
   * Find cross-chain route
   */
  private async findCrossChainRoute(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string
  ): Promise<SwapRoute[]> {
    // This would integrate with cross-chain bridges
    // For now, return a simple mock route
    
    const bridgeToken: Token = {
      address: '0xA0b86a33E6411c96b1799b119D3676C9c4f9a98f', // Mock USDC
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: inputToken.chainId,
    };

    const step1OutputAmount = await this.calculateSwapAmount(inputToken, bridgeToken, inputAmount);
    const step2OutputAmount = await this.calculateSwapAmount(
      { ...bridgeToken, chainId: outputToken.chainId }, 
      outputToken, 
      step1OutputAmount
    );

    return [
      {
        protocol: 'uniswap-v2',
        pool: 'mock-pool-1',
        tokenIn: inputToken,
        tokenOut: bridgeToken,
        amountIn: inputAmount,
        amountOut: step1OutputAmount,
      },
      {
        protocol: 'bridge',
        pool: 'cross-chain-bridge',
        tokenIn: bridgeToken,
        tokenOut: { ...bridgeToken, chainId: outputToken.chainId },
        amountIn: step1OutputAmount,
        amountOut: step1OutputAmount, // 1:1 for same token bridge
      },
      {
        protocol: 'uniswap-v2',
        pool: 'mock-pool-2',
        tokenIn: { ...bridgeToken, chainId: outputToken.chainId },
        tokenOut: outputToken,
        amountIn: step1OutputAmount,
        amountOut: step2OutputAmount,
      },
    ];
  }

  /**
   * Find multi-hop route through intermediate tokens
   */
  private async findMultiHopRoute(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string,
    pools: LiquidityPool[]
  ): Promise<SwapRoute[]> {
    // Common intermediate tokens (WETH, USDC, etc.)
    const intermediateTokens = [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86a33E6411c96b1799b119D3676C9c4f9a98f', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    ];

    for (const intermediateAddress of intermediateTokens) {
      // Check if we can go input -> intermediate -> output
      const firstPool = pools.find(pool =>
        (pool.token0.address === inputToken.address && pool.token1.address === intermediateAddress) ||
        (pool.token1.address === inputToken.address && pool.token0.address === intermediateAddress)
      );

      const secondPool = pools.find(pool =>
        (pool.token0.address === intermediateAddress && pool.token1.address === outputToken.address) ||
        (pool.token1.address === intermediateAddress && pool.token0.address === outputToken.address)
      );

      if (firstPool && secondPool) {
        const intermediateToken: Token = {
          address: intermediateAddress,
          symbol: 'INTERMEDIATE',
          name: 'Intermediate Token',
          decimals: 18,
          chainId: inputToken.chainId,
        };

        const step1Output = await this.calculatePoolOutputAmount(firstPool, inputToken, inputAmount);
        const step2Output = await this.calculatePoolOutputAmount(secondPool, intermediateToken, step1Output);

        return [
          {
            protocol: 'uniswap-v2',
            pool: firstPool.address,
            tokenIn: inputToken,
            tokenOut: intermediateToken,
            amountIn: inputAmount,
            amountOut: step1Output,
          },
          {
            protocol: 'uniswap-v2',
            pool: secondPool.address,
            tokenIn: intermediateToken,
            tokenOut: outputToken,
            amountIn: step1Output,
            amountOut: step2Output,
          },
        ];
      }
    }

    throw new Error('No route found for swap');
  }

  /**
   * Calculate output amount for a route
   */
  private async calculateOutputAmount(
    route: SwapRoute[],
    inputAmount: string,
    slippageTolerance: number
  ): Promise<string> {
    let currentAmount = inputAmount;

    for (const step of route) {
      currentAmount = step.amountOut;
    }

    // Apply slippage tolerance
    const outputAmount = parseFloat(currentAmount);
    const minOutputAmount = outputAmount * (1 - slippageTolerance);

    return minOutputAmount.toString();
  }

  /**
   * Calculate price impact
   */
  private async calculatePriceImpact(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string,
    outputAmount: string
  ): Promise<number> {
    try {
      // Get current market prices
      const inputPrice = await this.getTokenPrice(inputToken);
      const outputPrice = await this.getTokenPrice(outputToken);

      if (!inputPrice || !outputPrice) {
        return 0; // Return 0 if we can't get prices
      }

      // Calculate expected output based on market prices
      const expectedOutputUSD = parseFloat(inputAmount) * inputPrice;
      const expectedOutputTokens = expectedOutputUSD / outputPrice;

      // Calculate actual vs expected
      const actualOutput = parseFloat(outputAmount);
      const priceImpact = Math.abs(expectedOutputTokens - actualOutput) / expectedOutputTokens;

      return Math.min(priceImpact, 1); // Cap at 100%

    } catch (error) {
      this.logger.warn('Failed to calculate price impact', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Calculate fees for a swap
   */
  private async calculateFees(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string
  ): Promise<string> {
    // Different fee structures based on the swap type
    const baseFeeBps = 30; // 0.3% base fee
    let totalFeeBps = baseFeeBps;

    // Cross-chain swaps have higher fees
    if (inputToken.chainId !== outputToken.chainId) {
      totalFeeBps += 50; // Additional 0.5% for bridge fees
    }

    const feeAmount = (parseFloat(inputAmount) * totalFeeBps) / 10000;
    return feeAmount.toString();
  }

  /**
   * Estimate gas cost for a swap
   */
  private async estimateGasCost(chainId: ChainId, route: SwapRoute[]): Promise<string> {
    const gasPrice = this.gasPriceCache.get(chainId);
    if (!gasPrice) {
      return '0';
    }

    // Estimate gas units based on route complexity
    let estimatedGasUnits = 150000; // Base gas for simple swap
    
    // Additional gas for each hop
    estimatedGasUnits += (route.length - 1) * 50000;
    
    // Cross-chain operations need more gas
    if (route.some(step => step.protocol === 'bridge')) {
      estimatedGasUnits += 100000;
    }

    // Calculate cost in ETH/native token
    const gasPriceWei = parseFloat(gasPrice.standard) * 1e9; // Convert Gwei to Wei
    const gasCostWei = estimatedGasUnits * gasPriceWei;
    const gasCostEth = gasCostWei / 1e18; // Convert Wei to ETH

    return gasCostEth.toString();
  }

  /**
   * Update price feeds from external sources
   */
  async updatePriceFeeds(): Promise<void> {
    this.logger.info('Updating price feeds');

    try {
      await Promise.all([
        this.fetchPricesFromCodex(),
        this.fetchPricesFromTenderly(),
        this.fetchPricesFromEthers(),
      ]);

      this.logger.info('Price feeds updated successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update price feeds', { error: errorMessage });
    }
  }

  /**
   * Fetch prices from Codex
   */
  private async fetchPricesFromCodex(): Promise<void> {
    if (!this.env.CODEX_API_KEY) {
      this.logger.debug('Codex API key not configured');
      return;
    }

    try {
      // Mock implementation - in production, this would call actual Codex API
      const mockPrices = [
        { token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', price: 2800 + Math.random() * 200 }, // WETH
        { token: '0xA0b86a33E6411c96b1799b119D3676C9c4f9a98f', price: 1.00 + Math.random() * 0.02 }, // USDC
        { token: '0x6B175474E89094C44Da98b954EedeAC495271d0F', price: 1.00 + Math.random() * 0.02 }, // DAI
      ];

      for (const { token, price } of mockPrices) {
        await this.storePriceFeed(token, ChainId.ETHEREUM, price.toString(), 'codex');
      }

      this.logger.debug('Prices fetched from Codex', { count: mockPrices.length });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch prices from Codex', { error: errorMessage });
    }
  }

  /**
   * Fetch prices from Tenderly
   */
  private async fetchPricesFromTenderly(): Promise<void> {
    if (!this.env.TENDERLY_API_KEY) {
      this.logger.debug('Tenderly API key not configured');
      return;
    }

    // Mock implementation similar to Codex
    this.logger.debug('Tenderly prices fetched (mock)');
  }

  /**
   * Fetch prices from Ethers/other sources
   */
  private async fetchPricesFromEthers(): Promise<void> {
    // Mock implementation
    this.logger.debug('Ethers prices fetched (mock)');
  }

  /**
   * Store price feed data
   */
  private async storePriceFeed(
    tokenAddress: string,
    chainId: ChainId,
    priceUsd: string,
    source: string
  ): Promise<void> {
    const priceSource: PriceSource = {
      name: source,
      price: priceUsd,
      timestamp: Date.now(),
      confidence: Math.random() * 0.2 + 0.8, // 80-100% confidence
    };

    // Update in-memory cache
    const key = `${chainId}-${tokenAddress}`;
    const existing = this.priceCache.get(key) || [];
    existing.push(priceSource);
    
    // Keep only last 10 price points per source
    const filtered = existing
      .filter(p => p.name === source)
      .slice(-10)
      .concat(existing.filter(p => p.name !== source));
    
    this.priceCache.set(key, filtered);

    // Store in database
    await this.queryDatabase(
      `INSERT INTO price_feeds 
       (id, token_address, chain_id, price_usd, source, confidence, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `${tokenAddress}-${chainId}-${source}-${Date.now()}`,
        tokenAddress,
        chainId,
        priceUsd,
        source,
        priceSource.confidence,
        Date.now(),
      ]
    );
  }

  /**
   * Update gas prices for all chains
   */
  async updateGasPrices(): Promise<void> {
    this.logger.info('Updating gas prices');

    const chains = [
      ChainId.ETHEREUM,
      ChainId.BSC,
      ChainId.POLYGON,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM,
    ];

    for (const chainId of chains) {
      try {
        await this.updateGasPriceForChain(chainId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to update gas price for chain', { 
          chainId, 
          error: errorMessage 
        });
      }
    }
  }

  /**
   * Update gas price for a specific chain
   */
  private async updateGasPriceForChain(chainId: ChainId): Promise<void> {
    // Mock gas prices - in production, fetch from actual sources
    const baseGasPrice = this.getBaseGasPriceForChain(chainId);
    
    const gasPrice: GasPrice = {
      chainId,
      fast: (baseGasPrice * 1.5).toString(),
      standard: baseGasPrice.toString(),
      safe: (baseGasPrice * 0.8).toString(),
      timestamp: Date.now(),
    };

    this.gasPriceCache.set(chainId, gasPrice);

    // Store in database
    await this.queryDatabase(
      `INSERT INTO gas_prices (chain_id, fast, standard, safe, timestamp, source) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chainId, gasPrice.fast, gasPrice.standard, gasPrice.safe, Date.now(), 'internal']
    );

    this.logger.debug('Gas price updated for chain', { chainId, gasPrice });
  }

  /**
   * Get base gas price for a chain (in Gwei)
   */
  private getBaseGasPriceForChain(chainId: ChainId): number {
    switch (chainId) {
      case ChainId.ETHEREUM:
        return 20 + Math.random() * 30; // 20-50 Gwei
      case ChainId.BSC:
        return 5 + Math.random() * 5; // 5-10 Gwei
      case ChainId.POLYGON:
        return 30 + Math.random() * 20; // 30-50 Gwei
      case ChainId.ARBITRUM:
        return 0.1 + Math.random() * 0.4; // 0.1-0.5 Gwei
      case ChainId.OPTIMISM:
        return 0.001 + Math.random() * 0.004; // Very low
      default:
        return 10;
    }
  }

  /**
   * Load liquidity pools from database
   */
  private async loadLiquidityPools(): Promise<void> {
    try {
      const results = await this.queryDatabase('SELECT * FROM liquidity_pools');
      
      for (const row of results.results || []) {
        const chainId = row.chain_id;
        const key = chainId.toString();
        
        const pool: LiquidityPool = {
          address: row.address,
          token0: {
            address: row.token0_address,
            symbol: 'TOKEN0',
            name: 'Token 0',
            decimals: 18,
            chainId: chainId,
          },
          token1: {
            address: row.token1_address,
            symbol: 'TOKEN1', 
            name: 'Token 1',
            decimals: 18,
            chainId: chainId,
          },
          reserve0: row.reserve0,
          reserve1: row.reserve1,
          totalSupply: row.total_supply,
          fee: row.fee_rate,
          chainId: chainId,
        };

        const existing = this.liquidityPools.get(key) || [];
        existing.push(pool);
        this.liquidityPools.set(key, existing);
      }

      this.logger.info('Liquidity pools loaded', { 
        totalPools: results.results?.length || 0 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to load liquidity pools', { error: errorMessage });
    }
  }

  /**
   * Get token price from cache or fetch
   */
  private async getTokenPrice(token: Token): Promise<number | null> {
    const key = `${token.chainId}-${token.address}`;
    const priceSources = this.priceCache.get(key);
    
    if (!priceSources || priceSources.length === 0) {
      return null;
    }

    // Use weighted average of recent prices
    const recentPrices = priceSources.filter(
      p => Date.now() - p.timestamp < 300000 // Last 5 minutes
    );

    if (recentPrices.length === 0) {
      return null;
    }

    const weightedSum = recentPrices.reduce(
      (sum, p) => sum + parseFloat(p.price) * p.confidence,
      0
    );
    const totalWeight = recentPrices.reduce((sum, p) => sum + p.confidence, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }

  /**
   * Calculate swap amount for two tokens
   */
  private async calculateSwapAmount(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string
  ): Promise<string> {
    const inputPrice = await this.getTokenPrice(inputToken);
    const outputPrice = await this.getTokenPrice(outputToken);

    if (!inputPrice || !outputPrice) {
      // Fallback to 1:1 ratio if prices not available
      return inputAmount;
    }

    const inputValueUSD = parseFloat(inputAmount) * inputPrice;
    const outputAmount = inputValueUSD / outputPrice;

    return outputAmount.toString();
  }

  /**
   * Calculate output amount for a specific pool
   */
  private async calculatePoolOutputAmount(
    pool: LiquidityPool,
    inputToken: Token,
    inputAmount: string
  ): Promise<string> {
    // Use constant product formula (x * y = k)
    const isToken0 = pool.token0.address === inputToken.address;
    const inputReserve = parseFloat(isToken0 ? pool.reserve0 : pool.reserve1);
    const outputReserve = parseFloat(isToken0 ? pool.reserve1 : pool.reserve0);
    
    const inputAmountNum = parseFloat(inputAmount);
    const inputAmountWithFee = inputAmountNum * (1 - pool.fee / 10000); // Apply pool fee
    
    // Calculate output using AMM formula
    const outputAmount = (outputReserve * inputAmountWithFee) / (inputReserve + inputAmountWithFee);
    
    return outputAmount.toString();
  }

  /**
   * Get current gas prices
   */
  async getGasPrices(chainId?: ChainId): Promise<GasPrice[]> {
    if (chainId) {
      const gasPrice = this.gasPriceCache.get(chainId);
      return gasPrice ? [gasPrice] : [];
    }

    return Array.from(this.gasPriceCache.values());
  }

  /**
   * Get liquidity for a token pair
   */
  async getLiquidity(
    tokenA: Token,
    tokenB: Token
  ): Promise<LiquidityPool[]> {
    const chainPools = this.liquidityPools.get(tokenA.chainId.toString()) || [];
    
    return chainPools.filter(pool =>
      (pool.token0.address === tokenA.address && pool.token1.address === tokenB.address) ||
      (pool.token1.address === tokenA.address && pool.token0.address === tokenB.address)
    );
  }

  /**
   * Check if liquidity exists for a swap
   */
  async checkLiquidity(
    inputToken: Token,
    outputToken: Token,
    inputAmount: string
  ): Promise<boolean> {
    try {
      const route = await this.findBestRoute(inputToken, outputToken, inputAmount);
      return route.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported tokens for a chain
   */
  async getSupportedTokens(chainId: ChainId): Promise<Token[]> {
    const result = await this.queryDatabase(
      'SELECT * FROM tokens WHERE chain_id = ? AND is_verified = true',
      [chainId]
    );

    return (result.results || []).map((row: any) => ({
      address: row.address,
      symbol: row.symbol,
      name: row.name,
      decimals: row.decimals,
      chainId: row.chain_id,
      logoURI: row.logo_uri,
    }));
  }
}