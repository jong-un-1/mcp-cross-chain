/**
 * ERC20 Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ERC20Service } from './erc20-service';
import { ChainId } from '../../core/types';
import type { Env } from '../../core/types';

// Mock environment
const mockEnv = {
  // Database
  DB: {} as any,
  KV: {} as any,
  R2: {} as any,
  
  // RPC URLs
  ETHEREUM_RPC_URL: 'https://eth-mainnet.test',
  BSC_RPC_URL: 'https://bsc-mainnet.test',
  POLYGON_RPC_URL: 'https://polygon-mainnet.test',
  ARBITRUM_RPC_URL: 'https://arbitrum-mainnet.test',
  OPTIMISM_RPC_URL: 'https://optimism-mainnet.test',
  
  // API Keys
  CHAINBASE_API_KEY: 'test-key',
  TENDERLY_API_KEY: 'test-key',
} as unknown as Env;

describe('ERC20Service', () => {
  let erc20Service: ERC20Service;

  beforeEach(() => {
    erc20Service = new ERC20Service(mockEnv);
    
    // Mock the queryDatabase method
    vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValue({
      results: []
    });
    
    // Mock the httpRequest method
    vi.spyOn(erc20Service as any, 'httpRequest').mockResolvedValue({
      result: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000' // 1 ETH in wei
    });
    
    // Mock cache methods
    vi.spyOn(erc20Service as any, 'setCache').mockResolvedValue(undefined);
    vi.spyOn(erc20Service as any, 'getFromCache').mockResolvedValue(null);
    vi.spyOn(erc20Service as any, 'deleteFromCache').mockResolvedValue(undefined);
  });

  describe('Token Information', () => {
    it('should get token info from cache if available', async () => {
      const mockToken = {
        address: '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: ChainId.ETHEREUM,
        logoURI: 'https://example.com/usdc.png',
      };

      // Mock cache hit
      vi.spyOn(erc20Service as any, 'getFromCache').mockResolvedValueOnce(mockToken);

      const result = await erc20Service.getTokenInfo(mockToken.address, ChainId.ETHEREUM);
      
      expect(result).toEqual(mockToken);
    });

    it('should fetch token info from database if not in cache', async () => {
      const mockToken = {
        address: '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chain_id: ChainId.ETHEREUM,
        logo_uri: 'https://example.com/usdc.png',
      };

      // Mock database result
      vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValueOnce({
        results: [mockToken]
      });

      const result = await erc20Service.getTokenInfo(mockToken.address, ChainId.ETHEREUM);
      
      expect(result?.symbol).toBe('USDC');
      expect(result?.decimals).toBe(6);
    });

    it('should return null for non-existent token', async () => {
      // Mock empty database result
      vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValueOnce({
        results: []
      });

      // Mock failed chain fetch
      vi.spyOn(erc20Service as any, 'fetchTokenFromChain').mockResolvedValueOnce(null);

      const result = await erc20Service.getTokenInfo('0xinvalid', ChainId.ETHEREUM);
      
      expect(result).toBeNull();
    });
  });

  describe('Token Balance', () => {
    it('should get token balance', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const balance = await erc20Service.getBalance(tokenAddress, walletAddress, ChainId.ETHEREUM);
      
      expect(balance).toBe('1000000000000000000'); // 1 ETH in wei
    });

    it('should return cached balance if recent', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      // Set up cache
      const erc20ServiceAny = erc20Service as any;
      erc20ServiceAny.balanceCache.set(
        `balance:${ChainId.ETHEREUM}:${tokenAddress}:${walletAddress}`,
        {
          balance: '500000000000000000',
          timestamp: Date.now(),
        }
      );

      const balance = await erc20Service.getBalance(tokenAddress, walletAddress, ChainId.ETHEREUM);
      
      expect(balance).toBe('500000000000000000');
    });

    it('should return 0 for invalid balance call', async () => {
      // Mock error response
      vi.spyOn(erc20Service as any, 'httpRequest').mockResolvedValueOnce({
        error: { message: 'Invalid address' }
      });

      const balance = await erc20Service.getBalance('0xinvalid', '0xinvalid', ChainId.ETHEREUM);
      
      expect(balance).toBe('0');
    });
  });

  describe('Token Allowance', () => {
    it('should get token allowance', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const owner = '0x1234567890123456789012345678901234567890';
      const spender = '0x2345678901234567890123456789012345678901';

      const allowance = await erc20Service.getAllowance(tokenAddress, owner, spender, ChainId.ETHEREUM);
      
      expect(allowance).toBe('1000000000000000000');
    });
  });

  describe('Permit2 Generation', () => {
    it('should generate permit2 data', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const owner = '0x1234567890123456789012345678901234567890';
      const spender = '0x2345678901234567890123456789012345678901';
      const amount = '1000000000000000000';
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Mock permit2 nonce call
      vi.spyOn(erc20Service as any, 'getPermit2Nonce').mockResolvedValueOnce(0);

      const result = await erc20Service.generatePermit2Data(
        tokenAddress,
        owner,
        spender,
        amount,
        deadline,
        ChainId.ETHEREUM
      );

      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('types');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('permit');
      expect(result.domain.name).toBe('Permit2');
      expect(result.domain.chainId).toBe(ChainId.ETHEREUM);
    });

    it('should throw error for unsupported chain', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const owner = '0x1234567890123456789012345678901234567890';
      const spender = '0x2345678901234567890123456789012345678901';
      const amount = '1000000000000000000';
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        erc20Service.generatePermit2Data(
          tokenAddress,
          owner,
          spender,
          amount,
          deadline,
          999 as ChainId // Invalid chain ID
        )
      ).rejects.toThrow('Permit2 not supported on chain 999');
    });
  });

  describe('Transaction Preparation', () => {
    it('should prepare transfer transaction', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const to = '0x1234567890123456789012345678901234567890';
      const amount = '1000000000000000000';

      const tx = await erc20Service.prepareTransfer(tokenAddress, to, amount, ChainId.ETHEREUM);

      expect(tx.to).toBe(tokenAddress);
      expect(tx.value).toBe('0');
      expect(tx.data).toMatch(/^0xa9059cbb/); // transfer function selector
    });

    it('should prepare approve transaction', async () => {
      const tokenAddress = '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d';
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = '1000000000000000000';

      const tx = await erc20Service.prepareApprove(tokenAddress, spender, amount, ChainId.ETHEREUM);

      expect(tx.to).toBe(tokenAddress);
      expect(tx.value).toBe('0');
      expect(tx.data).toMatch(/^0x095ea7b3/); // approve function selector
    });
  });

  describe('Supported Tokens', () => {
    it('should get supported tokens for a chain', async () => {
      const mockTokens = [
        {
          address: '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chain_id: ChainId.ETHEREUM,
          logo_uri: 'https://example.com/usdc.png',
        },
        {
          address: '0xb0c86b33e6d91c0576e8f2c1d2d8c8f10c2f4d1e',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          chain_id: ChainId.ETHEREUM,
          logo_uri: 'https://example.com/usdt.png',
        },
      ];

      vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValueOnce({
        results: mockTokens
      });

      const result = await erc20Service.getSupportedTokens(ChainId.ETHEREUM);

      expect(result).toHaveLength(2);
      expect(result[0]?.symbol).toBe('USDC');
      expect(result[1]?.symbol).toBe('USDT');
    });

    it('should return empty array on database error', async () => {
      vi.spyOn(erc20Service as any, 'queryDatabase').mockRejectedValueOnce(new Error('DB Error'));

      const result = await erc20Service.getSupportedTokens(ChainId.ETHEREUM);

      expect(result).toEqual([]);
    });
  });

  describe('Token Management', () => {
    it('should save token successfully', async () => {
      const token = {
        address: '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: ChainId.ETHEREUM,
        logoURI: 'https://example.com/usdc.png',
      };

      vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValueOnce({});

      const result = await erc20Service.saveToken(token);

      expect(result).toBe(true);
    });

    it('should return false on save error', async () => {
      const token = {
        address: '0xa0b86a33e6c91b0576d8e2b1c2c8b8e10b2e4c1d',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: ChainId.ETHEREUM,
      };

      vi.spyOn(erc20Service as any, 'queryDatabase').mockRejectedValueOnce(new Error('DB Error'));

      const result = await erc20Service.saveToken(token);

      expect(result).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      // Mock successful database call
      vi.spyOn(erc20Service as any, 'queryDatabase').mockResolvedValueOnce({});
      
      // Mock successful cache operations
      vi.spyOn(erc20Service as any, 'setCache').mockResolvedValueOnce(undefined);
      vi.spyOn(erc20Service as any, 'getFromCache').mockResolvedValueOnce('ok');

      const result = await (erc20Service as any).onHealthCheck();

      expect(result.database).toBe('ok');
      expect(result.cache).toBe('ok');
      expect(result.tokenCache).toBe('empty'); // No tokens in cache initially
    });

    it('should report errors in health check', async () => {
      // Mock database error
      vi.spyOn(erc20Service as any, 'queryDatabase').mockRejectedValueOnce(new Error('DB Error'));

      const result = await (erc20Service as any).onHealthCheck();

      expect(result.database).toBe('error');
    });
  });
});