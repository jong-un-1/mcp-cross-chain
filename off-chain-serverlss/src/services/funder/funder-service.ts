import { BaseService } from '../../core/base-service';
import type { 
  Env, 
  FundingConfig, 
  AddressFunding,
  Token
} from '../../core/types';
import { ChainId } from '../../core/types';

/**
 * Funder Service
 * 
 * Responsibilities:
 * - Funds addresses controlled by Lit Actions
 * - Configs funding params such as lowest threshold
 * - Puts ETH, SOL into blockchain
 * - Builds permit2data for ERC20 shared service
 */
export class FunderService extends BaseService {
  private fundingConfig: FundingConfig;
  private monitoredAddresses: Set<string> = new Set();

  constructor(env: Env) {
    super(env);
    
    // Default funding configuration
    this.fundingConfig = {
      minEthBalance: '0.01', // 0.01 ETH minimum
      minSolBalance: '0.1',  // 0.1 SOL minimum
      fundingThreshold: 0.5, // Trigger funding at 50% of minimum
      maxFundingAmount: '1.0', // Maximum 1 ETH/SOL per funding
    };
  }

  get serviceName(): string {
    return 'funder';
  }

  protected async onInitialize(): Promise<void> {
    await this.loadMonitoredAddresses();
    await this.setupFundingConfiguration();
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    const fundingStatus = await this.checkAllAddressesFunding();
    const needsFunding = fundingStatus.filter(status => status.needsFunding).length;

    return {
      monitoredAddresses: this.monitoredAddresses.size,
      addressesNeedingFunding: needsFunding,
      totalAddresses: fundingStatus.length,
      fundingConfig: this.fundingConfig,
    };
  }

  /**
   * Load monitored addresses from configuration
   */
  private async loadMonitoredAddresses(): Promise<void> {
    // Load from database or configuration
    // For now, using placeholder addresses
    const addresses = [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012',
    ];

    addresses.forEach(address => this.monitoredAddresses.add(address));
    
    this.logger.info('Monitored addresses loaded', { 
      count: this.monitoredAddresses.size 
    });
  }

  /**
   * Setup funding configuration
   */
  private async setupFundingConfiguration(): Promise<void> {
    // Load configuration from environment or database
    if (this.env.MIN_ETH_BALANCE) {
      this.fundingConfig.minEthBalance = this.env.MIN_ETH_BALANCE;
    }
    
    this.logger.info('Funding configuration setup', { config: this.fundingConfig });
  }

  /**
   * Check funding status for all monitored addresses
   */
  async checkAllAddressesFunding(): Promise<AddressFunding[]> {
    const results: AddressFunding[] = [];

    for (const address of this.monitoredAddresses) {
      try {
        // Check ETH balance
        const ethFunding = await this.checkAddressFunding(address, ChainId.ETHEREUM);
        results.push(ethFunding);

        // Check other chains if needed
        const bscFunding = await this.checkAddressFunding(address, ChainId.BSC);
        results.push(bscFunding);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to check funding for address', { 
          address, 
          error: errorMessage 
        });
      }
    }

    return results;
  }

  /**
   * Check funding status for a specific address on a chain
   */
  async checkAddressFunding(address: string, chainId: ChainId): Promise<AddressFunding> {
    try {
      const balance = await this.getAddressBalance(address, chainId);
      const threshold = this.getFundingThreshold(chainId);
      const needsFunding = parseFloat(balance) < parseFloat(threshold);

      return {
        address,
        chain: chainId,
        balance,
        threshold,
        needsFunding,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to check address funding', { 
        address, 
        chainId, 
        error: errorMessage 
      });
      
      // Return safe defaults
      return {
        address,
        chain: chainId,
        balance: '0',
        threshold: this.getFundingThreshold(chainId),
        needsFunding: true,
      };
    }
  }

  /**
   * Fund addresses that need funding
   */
  async fundAddresses(addresses: AddressFunding[]): Promise<void> {
    const addressesToFund = addresses.filter(addr => addr.needsFunding);
    
    if (addressesToFund.length === 0) {
      this.logger.info('No addresses need funding');
      return;
    }

    this.logger.info('Starting funding process', { 
      addressCount: addressesToFund.length 
    });

    for (const addressFunding of addressesToFund) {
      try {
        await this.fundSingleAddress(addressFunding);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to fund address', { 
          address: addressFunding.address,
          chain: addressFunding.chain,
          error: errorMessage 
        });
      }
    }
  }

  /**
   * Fund a single address
   */
  private async fundSingleAddress(addressFunding: AddressFunding): Promise<void> {
    const { address, chain } = addressFunding;
    const fundingAmount = this.calculateFundingAmount(addressFunding);
    
    this.logger.info('Funding address', { 
      address, 
      chain, 
      amount: fundingAmount 
    });

    // Execute funding transaction
    const txHash = await this.executeFunding(address, chain, fundingAmount);
    
    this.logger.info('Funding transaction sent', { 
      address, 
      chain, 
      amount: fundingAmount,
      txHash 
    });

    // Cache the funding action
    await this.setCache(`funding:${address}:${chain}`, {
      txHash,
      amount: fundingAmount,
      timestamp: Date.now(),
    }, 3600);
  }

  /**
   * Calculate how much to fund
   */
  private calculateFundingAmount(addressFunding: AddressFunding): string {
    const currentBalance = parseFloat(addressFunding.balance);
    const threshold = parseFloat(addressFunding.threshold);
    const maxFunding = parseFloat(this.fundingConfig.maxFundingAmount);
    
    // Fund to bring balance above threshold
    const neededAmount = threshold - currentBalance + (threshold * 0.5); // Add 50% buffer
    
    return Math.min(neededAmount, maxFunding).toString();
  }

  /**
   * Execute funding transaction
   */
  private async executeFunding(
    address: string, 
    chainId: ChainId, 
    amount: string
  ): Promise<string> {
    // This would integrate with blockchain networks to send native tokens
    // For now, return a mock transaction hash
    
    const rpcUrl = this.getRpcUrl(chainId);
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }

    // Mock transaction - in production, this would use ethers.js or similar
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    this.logger.info('Funding transaction executed', {
      address,
      chainId,
      amount,
      txHash: mockTxHash,
    });

    return mockTxHash;
  }

  /**
   * Get address balance on a specific chain
   */
  private async getAddressBalance(address: string, chainId: ChainId): Promise<string> {
    const rpcUrl = this.getRpcUrl(chainId);
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }

    try {
      // This would make actual RPC calls to get balance
      // For now, return mock balance
      const mockBalance = (Math.random() * 0.1).toFixed(6);
      return mockBalance;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get balance', { 
        address, 
        chainId, 
        error: errorMessage 
      });
      throw error;
    }
  }

  /**
   * Get funding threshold for a chain
   */
  private getFundingThreshold(chainId: ChainId): string {
    switch (chainId) {
      case ChainId.ETHEREUM:
      case ChainId.ARBITRUM:
      case ChainId.OPTIMISM:
        return (parseFloat(this.fundingConfig.minEthBalance) * this.fundingConfig.fundingThreshold).toString();
      case ChainId.BSC:
      case ChainId.POLYGON:
        return (parseFloat(this.fundingConfig.minEthBalance) * this.fundingConfig.fundingThreshold * 0.1).toString(); // Lower for cheaper chains
      case ChainId.SOLANA:
        return (parseFloat(this.fundingConfig.minSolBalance) * this.fundingConfig.fundingThreshold).toString();
      default:
        return this.fundingConfig.minEthBalance;
    }
  }

  /**
   * Get RPC URL for a chain
   */
  private getRpcUrl(chainId: ChainId): string | undefined {
    switch (chainId) {
      case ChainId.ETHEREUM:
        return this.env.ETHEREUM_RPC_URL;
      case ChainId.BSC:
        return this.env.BSC_RPC_URL;
      case ChainId.POLYGON:
        return this.env.POLYGON_RPC_URL;
      case ChainId.ARBITRUM:
        return this.env.ARBITRUM_RPC_URL;
      case ChainId.OPTIMISM:
        return this.env.OPTIMISM_RPC_URL;
      case ChainId.SOLANA:
        return this.env.SOLANA_RPC_URL;
      default:
        return undefined;
    }
  }

  /**
   * Build permit2 data for ERC20 tokens
   */
  async buildPermit2Data(
    token: Token,
    owner: string,
    spender: string,
    amount: string,
    deadline: number
  ): Promise<any> {
    try {
      // This would build the permit2 signature data for ERC20 tokens
      // Permit2 allows gas-less token approvals
      
      const permit2Data = {
        token: token.address,
        owner,
        spender,
        amount,
        deadline,
        nonce: Math.floor(Math.random() * 1000000),
        chainId: token.chainId,
      };

      this.logger.info('Permit2 data built', {
        token: token.symbol,
        owner,
        spender,
        amount,
      });

      return permit2Data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to build permit2 data', {
        token: token.symbol,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Add address to monitoring
   */
  async addMonitoredAddress(address: string): Promise<void> {
    this.monitoredAddresses.add(address);
    
    // Persist to database
    await this.queryDatabase(
      'INSERT OR REPLACE INTO monitored_addresses (address, created_at) VALUES (?, ?)',
      [address, Date.now()]
    );

    this.logger.info('Address added to monitoring', { address });
  }

  /**
   * Remove address from monitoring
   */
  async removeMonitoredAddress(address: string): Promise<void> {
    this.monitoredAddresses.delete(address);
    
    // Remove from database
    await this.queryDatabase(
      'DELETE FROM monitored_addresses WHERE address = ?',
      [address]
    );

    this.logger.info('Address removed from monitoring', { address });
  }

  /**
   * Update funding configuration
   */
  async updateFundingConfig(config: Partial<FundingConfig>): Promise<void> {
    this.fundingConfig = { ...this.fundingConfig, ...config };
    
    // Persist to database or environment
    await this.setCache('funder:config', this.fundingConfig, 86400); // 24 hours
    
    this.logger.info('Funding configuration updated', { config: this.fundingConfig });
  }

  /**
   * Get funding configuration
   */
  getFundingConfig(): FundingConfig {
    return { ...this.fundingConfig };
  }
}