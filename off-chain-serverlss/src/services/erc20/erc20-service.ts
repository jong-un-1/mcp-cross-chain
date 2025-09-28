import { BaseService } from '../../core/base-service';
import type { Env, Token } from '../../core/types';
import { ChainId } from '../../core/types';

/**
 * ERC20 Shared Service
 * 
 * Responsibilities:
 * - Standard ERC20 token operations (balance, transfer, approve)
 * - Permit2 signature generation and validation
 * - Token metadata retrieval and caching
 * - Multi-chain token address resolution
 * - Token price feeds integration
 * - Allowance management
 * - Transaction preparation for ERC20 operations
 */
export class ERC20Service extends BaseService {
  private tokenCache = new Map<string, Token>();
  private balanceCache = new Map<string, { balance: string; timestamp: number }>();
  
  constructor(env: Env) {
    super(env);
  }

  get serviceName(): string {
    return 'erc20';
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string, chainId: ChainId): Promise<Token | null> {
    const cacheKey = `token:${chainId}:${tokenAddress}`;
    
    // Check cache first
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey)!;
    }

    try {
      // Query from database
      const token = await this.queryDatabase(
        'SELECT * FROM tokens WHERE address = ? AND chain_id = ?',
        [tokenAddress, chainId]
      );

      if (token && token.results?.length > 0) {
        const tokenData: Token = {
          address: token.results[0].address,
          symbol: token.results[0].symbol,
          name: token.results[0].name,
          decimals: token.results[0].decimals,
          chainId: token.results[0].chain_id,
          logoURI: token.results[0].logo_uri,
        };

        this.tokenCache.set(cacheKey, tokenData);
        await this.setCache(cacheKey, tokenData, 3600); // 1 hour cache
        return tokenData;
      }

      // If not found in database, try to fetch from chain
      const chainToken = await this.fetchTokenFromChain(tokenAddress, chainId);
      if (chainToken) {
        await this.saveTokenToDatabase(chainToken);
        this.tokenCache.set(cacheKey, chainToken);
        await this.setCache(cacheKey, chainToken, 3600);
        return chainToken;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get token info: ${error}`);
      return null;
    }
  }

  /**
   * Get token balance for an address
   */
  async getBalance(tokenAddress: string, walletAddress: string, chainId: ChainId): Promise<string> {
    const cacheKey = `balance:${chainId}:${tokenAddress}:${walletAddress}`;
    const cached = this.balanceCache.get(cacheKey);
    
    // Return cached balance if less than 30 seconds old
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.balance;
    }

    try {
      const rpcUrl = this.getRpcUrl(chainId);
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${chainId}`);
      }

      // ERC20 balanceOf call
      const balanceOfSelector = '0x70a08231'; // balanceOf(address)
      const paddedAddress = walletAddress.slice(2).padStart(64, '0');
      const callData = balanceOfSelector + paddedAddress;

      const response = await this.httpRequest<any>(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: callData,
            },
            'latest'
          ],
        }),
      });

      if (response.error) {
        throw new Error(`RPC error: ${response.error.message}`);
      }

      const balance = response.result || '0x0';
      const balanceStr = BigInt(balance).toString();

      // Cache the result
      this.balanceCache.set(cacheKey, { balance: balanceStr, timestamp: Date.now() });
      await this.setCache(cacheKey, balanceStr, 30); // 30 second cache

      return balanceStr;
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error}`);
      return '0';
    }
  }

  /**
   * Get token allowance
   */
  async getAllowance(
    tokenAddress: string,
    owner: string,
    spender: string,
    chainId: ChainId
  ): Promise<string> {
    try {
      const rpcUrl = this.getRpcUrl(chainId);
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${chainId}`);
      }

      // ERC20 allowance(address,address) call  
      const allowanceSelector = '0xdd62ed3e';
      const paddedOwner = owner.slice(2).padStart(64, '0');
      const paddedSpender = spender.slice(2).padStart(64, '0');
      const callData = allowanceSelector + paddedOwner + paddedSpender;

      const response = await this.httpRequest<any>(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: callData,
            },
            'latest'
          ],
        }),
      });

      if (response.error) {
        throw new Error(`RPC error: ${response.error.message}`);
      }

      const allowance = response.result || '0x0';
      return BigInt(allowance).toString();
    } catch (error) {
      this.logger.error(`Failed to get allowance: ${error}`);
      return '0';
    }
  }

  /**
   * Generate Permit2 signature data
   */
  async generatePermit2Data(
    tokenAddress: string,
    owner: string,
    spender: string,
    amount: string,
    deadline: number,
    chainId: ChainId
  ): Promise<{
    domain: any;
    types: any;
    message: any;
    permit: any;
  }> {
    try {
      // Get Permit2 contract address for the chain
      const permit2Address = this.getPermit2Address(chainId);
      if (!permit2Address) {
        throw new Error(`Permit2 not supported on chain ${chainId}`);
      }

      // Get current nonce for the owner/spender pair
      const nonce = await this.getPermit2Nonce(permit2Address, owner, spender, chainId);

      const permitDetails = {
        token: tokenAddress,
        amount: amount,
        expiration: deadline,
        nonce: nonce,
      };

      const permit = {
        details: permitDetails,
        spender: spender,
        sigDeadline: deadline,
      };

      const domain = {
        name: 'Permit2',
        chainId: chainId,
        verifyingContract: permit2Address,
      };

      const types = {
        PermitSingle: [
          { name: 'details', type: 'PermitDetails' },
          { name: 'spender', type: 'address' },
          { name: 'sigDeadline', type: 'uint256' },
        ],
        PermitDetails: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
          { name: 'expiration', type: 'uint48' },
          { name: 'nonce', type: 'uint48' },
        ],
      };

      const message = permit;

      return {
        domain,
        types,
        message,
        permit,
      };
    } catch (error) {
      this.logger.error(`Failed to generate Permit2 data: ${error}`);
      throw error;
    }
  }

  /**
   * Prepare transfer transaction data
   */
  async prepareTransfer(
    tokenAddress: string,
    to: string,
    amount: string,
    chainId: ChainId
  ): Promise<{
    to: string;
    data: string;
    value: string;
  }> {
    try {
      // ERC20 transfer(address,uint256) function selector
      const transferSelector = '0xa9059cbb';
      const paddedTo = to.slice(2).padStart(64, '0');
      const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
      const callData = transferSelector + paddedTo + paddedAmount;

      return {
        to: tokenAddress,
        data: callData,
        value: '0',
      };
    } catch (error) {
      this.logger.error(`Failed to prepare transfer: ${error}`);
      throw error;
    }
  }

  /**
   * Prepare approve transaction data
   */
  async prepareApprove(
    tokenAddress: string,
    spender: string,
    amount: string,
    chainId: ChainId
  ): Promise<{
    to: string;
    data: string;
    value: string;
  }> {
    try {
      // ERC20 approve(address,uint256) function selector
      const approveSelector = '0x095ea7b3';
      const paddedSpender = spender.slice(2).padStart(64, '0');
      const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
      const callData = approveSelector + paddedSpender + paddedAmount;

      return {
        to: tokenAddress,
        data: callData,
        value: '0',
      };
    } catch (error) {
      this.logger.error(`Failed to prepare approve: ${error}`);
      throw error;
    }
  }

  /**
   * Get supported tokens for a chain
   */
  async getSupportedTokens(chainId: ChainId, limit = 100, offset = 0): Promise<Token[]> {
    try {
      const result = await this.queryDatabase(
        `SELECT * FROM tokens 
         WHERE chain_id = ? AND is_verified = 1 
         ORDER BY symbol 
         LIMIT ? OFFSET ?`,
        [chainId, limit, offset]
      );

      if (!result.results) return [];

      return result.results.map((row: any) => ({
        address: row.address,
        symbol: row.symbol,
        name: row.name,
        decimals: row.decimals,
        chainId: row.chain_id,
        logoURI: row.logo_uri,
      }));
    } catch (error) {
      this.logger.error(`Failed to get supported tokens: ${error}`);
      return [];
    }
  }

  /**
   * Add or update token in database
   */
  async saveToken(token: Token): Promise<boolean> {
    try {
      await this.queryDatabase(
        `INSERT OR REPLACE INTO tokens 
         (id, address, symbol, name, decimals, chain_id, logo_uri, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${token.symbol}-${token.chainId}`,
          token.address,
          token.symbol,
          token.name,
          token.decimals,
          token.chainId,
          token.logoURI || null,
          Math.floor(Date.now() / 1000),
        ]
      );

      // Clear cache
      const cacheKey = `token:${token.chainId}:${token.address}`;
      this.tokenCache.delete(cacheKey);
      await this.deleteFromCache(cacheKey);

      return true;
    } catch (error) {
      this.logger.error(`Failed to save token: ${error}`);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private getRpcUrl(chainId: ChainId): string | null {
    switch (chainId) {
      case ChainId.ETHEREUM:
        return this.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
      case ChainId.BSC:
        return this.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org';
      case ChainId.POLYGON:
        return this.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
      case ChainId.ARBITRUM:
        return this.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
      case ChainId.OPTIMISM:
        return this.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io';
      default:
        return null;
    }
  }

  private getPermit2Address(chainId: ChainId): string | null {
    // Permit2 is deployed at the same address across multiple chains
    const PERMIT2_ADDRESSES: { [key in ChainId]?: string } = {
      [ChainId.ETHEREUM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.BSC]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.POLYGON]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.ARBITRUM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.OPTIMISM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    };

    return PERMIT2_ADDRESSES[chainId] || null;
  }

  private async getPermit2Nonce(
    permit2Address: string,
    owner: string,
    spender: string,
    chainId: ChainId
  ): Promise<number> {
    try {
      const rpcUrl = this.getRpcUrl(chainId);
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${chainId}`);
      }

      // Call allowance function to get nonce
      const allowanceSelector = '0x927da105'; // allowance(address,address,address)
      const paddedOwner = owner.slice(2).padStart(64, '0');
      const paddedToken = '0x0000000000000000000000000000000000000000'.slice(2).padStart(64, '0');
      const paddedSpender = spender.slice(2).padStart(64, '0');
      const callData = allowanceSelector + paddedOwner + paddedToken + paddedSpender;

      const response = await this.httpRequest<any>(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: permit2Address,
              data: callData,
            },
            'latest'
          ],
        }),
      });

      if (response.error) {
        throw new Error(`RPC error: ${response.error.message}`);
      }

      // Parse the response to extract nonce (third return value)
      const result = response.result || '0x0';
      const decoded = result.slice(2);
      
      // Each return value is 32 bytes (64 hex chars)
      if (decoded.length >= 192) { // 3 * 64 hex chars
        const nonceHex = '0x' + decoded.slice(128, 192); // Third 32-byte value
        return parseInt(nonceHex, 16);
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get Permit2 nonce: ${error}`);
      return 0;
    }
  }

  private async fetchTokenFromChain(tokenAddress: string, chainId: ChainId): Promise<Token | null> {
    try {
      const rpcUrl = this.getRpcUrl(chainId);
      if (!rpcUrl) {
        return null;
      }

      // Fetch name, symbol, and decimals
      const nameCall = this.createContractCall('0x06fdde03'); // name()
      const symbolCall = this.createContractCall('0x95d89b41'); // symbol()  
      const decimalsCall = this.createContractCall('0x313ce567'); // decimals()

      const [nameResponse, symbolResponse, decimalsResponse] = await Promise.all([
        this.callContract(rpcUrl, tokenAddress, nameCall),
        this.callContract(rpcUrl, tokenAddress, symbolCall),
        this.callContract(rpcUrl, tokenAddress, decimalsCall),
      ]);

      if (nameResponse.error || symbolResponse.error || decimalsResponse.error) {
        return null;
      }

      // Decode responses
      const name = this.decodeString(nameResponse.result);
      const symbol = this.decodeString(symbolResponse.result);
      const decimals = parseInt(decimalsResponse.result || '0x12', 16); // Default to 18

      return {
        address: tokenAddress,
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        decimals: decimals,
        chainId: chainId,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch token from chain: ${error}`);
      return null;
    }
  }

  private createContractCall(selector: string): string {
    return selector;
  }

  private async callContract(rpcUrl: string, contractAddress: string, callData: string): Promise<any> {
    return this.httpRequest(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: callData,
          },
          'latest'
        ],
      }),
    });
  }

  private decodeString(hexData: string): string {
    try {
      if (!hexData || hexData === '0x') return '';
      
      // Remove 0x prefix
      const hex = hexData.slice(2);
      
      // Skip the first 64 chars (offset) and next 64 chars (length)
      if (hex.length < 128) return '';
      
      const lengthHex = hex.slice(64, 128);
      const length = parseInt(lengthHex, 16);
      
      if (length === 0) return '';
      
      const dataHex = hex.slice(128, 128 + length * 2);
      // Convert hex to string without Buffer (for Cloudflare Workers)
      const bytes = [];
      for (let i = 0; i < dataHex.length; i += 2) {
        bytes.push(parseInt(dataHex.substr(i, 2), 16));
      }
      return String.fromCharCode(...bytes);
    } catch (error) {
      return '';
    }
  }

  private async saveTokenToDatabase(token: Token): Promise<void> {
    try {
      await this.queryDatabase(
        `INSERT OR IGNORE INTO tokens 
         (id, address, symbol, name, decimals, chain_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${token.symbol}-${token.chainId}`,
          token.address,
          token.symbol,
          token.name,
          token.decimals,
          token.chainId,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        ]
      );
    } catch (error) {
      this.logger.error(`Failed to save token to database: ${error}`);
    }
  }

  /**
   * Health check implementation
   */
  protected async onHealthCheck(): Promise<Record<string, any>> {
    const checks: Record<string, any> = {};
    
    try {
      // Test database connection
      await this.queryDatabase('SELECT 1');
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
    }
    
    try {
      // Test cache
      const testKey = 'health-check-erc20';
      await this.setCache(testKey, 'ok', 10);
      const cached = await this.getFromCache(testKey);
      checks.cache = cached === 'ok' ? 'ok' : 'error';
    } catch (error) {
      checks.cache = 'error';
    }
    
    checks.tokenCache = this.tokenCache.size > 0 ? 'ok' : 'empty';
    checks.balanceCache = this.balanceCache.size;
    
    return checks;
  }
}