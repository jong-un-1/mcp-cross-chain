import { BaseService } from '../../core/base-service';
import type { 
  Env, 
  BlockchainEvent, 
  IndexerStatus,
  BalanceInfo,
  Token
} from '../../core/types';
import { ChainId } from '../../core/types';

/**
 * Indexer Service
 * 
 * Responsibilities:
 * - Continuous connection to supported blockchains
 * - Listens for relevant events and s
 * - Periodically queries smart-contracts' state
 * - Saves info off-chain in a database
 * - Extracts metrics from chain
 * - Keeps track of user balances
 */
export class IndexerService extends BaseService {
  private isIndexing: Map<ChainId, boolean> = new Map();
  private lastSyncedBlocks: Map<ChainId, number> = new Map();
  private contractAddresses: Map<ChainId, string[]> = new Map();

  constructor(env: Env) {
    super(env);
    this.initializeContractAddresses();
  }

  get serviceName(): string {
    return 'indexer';
  }

  protected async onInitialize(): Promise<void> {
    await this.loadIndexerStatus();
    await this.startIndexingForAllChains();
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    const chainStatuses = await this.getAllChainStatuses();
    const healthyChains = chainStatuses.filter(status => status.isHealthy).length;
    const totalEvents = await this.getTotalEventsIndexed();

    return {
      supportedChains: Array.from(this.contractAddresses.keys()).length,
      healthyChains,
      totalChains: chainStatuses.length,
      totalEventsIndexed: totalEvents,
      indexingStatus: Object.fromEntries(this.isIndexing),
      chainStatuses,
    };
  }

  /**
   * Initialize contract addresses for each chain
   */
  private initializeContractAddresses(): void {
    // DEX Router and Vault contract addresses for each chain
    this.contractAddresses.set(ChainId.ETHEREUM, [
      '0x1234567890123456789012345678901234567890', // JURouter
      '0x2345678901234567890123456789012345678901', // JUVault
    ]);

    this.contractAddresses.set(ChainId.BSC, [
      '0x3456789012345678901234567890123456789012',
      '0x4567890123456789012345678901234567890123',
    ]);

    this.contractAddresses.set(ChainId.POLYGON, [
      '0x5678901234567890123456789012345678901234',
      '0x6789012345678901234567890123456789012345',
    ]);

    this.contractAddresses.set(ChainId.ARBITRUM, [
      '0x7890123456789012345678901234567890123456',
      '0x8901234567890123456789012345678901234567',
    ]);

    this.contractAddresses.set(ChainId.OPTIMISM, [
      '0x9012345678901234567890123456789012345678',
      '0x0123456789012345678901234567890123456789',
    ]);
  }

  /**
   * Load indexer status from database
   */
  private async loadIndexerStatus(): Promise<void> {
    try {
      const results = await this.queryDatabase('SELECT * FROM indexer_status');
      
      for (const row of results.results || []) {
        this.lastSyncedBlocks.set(row.chain_id, row.current_block || 0);
      }

      this.logger.info('Indexer status loaded', {
        chainsLoaded: this.lastSyncedBlocks.size
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to load indexer status', { error: errorMessage });
    }
  }

  /**
   * Start indexing for all supported chains
   */
  private async startIndexingForAllChains(): Promise<void> {
    const chains = Array.from(this.contractAddresses.keys());
    
    for (const chainId of chains) {
      try {
        await this.startIndexingForChain(chainId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to start indexing for chain', { 
          chainId, 
          error: errorMessage 
        });
      }
    }
  }

  /**
   * Start indexing for a specific chain
   */
  async startIndexingForChain(chainId: ChainId): Promise<void> {
    if (this.isIndexing.get(chainId)) {
      this.logger.warn('Indexing already running for chain', { chainId });
      return;
    }

    this.isIndexing.set(chainId, true);
    this.logger.info('Starting indexing for chain', { chainId });

    try {
      // Get the latest block number
      const latestBlock = await this.getLatestBlockNumber(chainId);
      const startBlock = this.lastSyncedBlocks.get(chainId) || latestBlock - 1000; // Start from 1000 blocks back if no previous sync

      // Index events from startBlock to latestBlock
      await this.indexEventsForChain(chainId, startBlock, latestBlock);

      // Update sync status
      await this.updateIndexerStatus(chainId, latestBlock, latestBlock);

      this.logger.info('Initial indexing completed for chain', { 
        chainId, 
        fromBlock: startBlock, 
        toBlock: latestBlock 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to start indexing for chain', { 
        chainId, 
        error: errorMessage 
      });
      this.isIndexing.set(chainId, false);
    }
  }

  /**
   * Stop indexing for a specific chain
   */
  async stopIndexingForChain(chainId: ChainId): Promise<void> {
    this.isIndexing.set(chainId, false);
    this.logger.info('Stopped indexing for chain', { chainId });
  }

  /**
   * Sync recent events for all chains (called by cron)
   */
  async syncRecentEvents(): Promise<void> {
    this.logger.info('Starting recent events sync');

    for (const [chainId, isIndexing] of this.isIndexing.entries()) {
      if (!isIndexing) continue;

      try {
        await this.syncRecentEventsForChain(chainId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to sync recent events for chain', { 
          chainId, 
          error: errorMessage 
        });
      }
    }

    this.logger.info('Recent events sync completed');
  }

  /**
   * Sync recent events for a specific chain
   */
  private async syncRecentEventsForChain(chainId: ChainId): Promise<void> {
    const latestBlock = await this.getLatestBlockNumber(chainId);
    const lastSyncedBlock = this.lastSyncedBlocks.get(chainId) || 0;

    if (latestBlock <= lastSyncedBlock) {
      this.logger.debug('No new blocks to sync', { chainId, latestBlock, lastSyncedBlock });
      return;
    }

    const fromBlock = lastSyncedBlock + 1;
    const toBlock = Math.min(fromBlock + 100, latestBlock); // Process max 100 blocks at a time

    this.logger.debug('Syncing events for chain', { 
      chainId, 
      fromBlock, 
      toBlock 
    });

    await this.indexEventsForChain(chainId, fromBlock, toBlock);
    await this.updateIndexerStatus(chainId, toBlock, latestBlock);
    
    this.lastSyncedBlocks.set(chainId, toBlock);
  }

  /**
   * Index events for a chain within a block range
   */
  private async indexEventsForChain(
    chainId: ChainId, 
    fromBlock: number, 
    toBlock: number
  ): Promise<void> {
    const contractAddresses = this.contractAddresses.get(chainId) || [];
    
    for (const contractAddress of contractAddresses) {
      try {
        const events = await this.getContractEvents(chainId, contractAddress, fromBlock, toBlock);
        await this.saveEvents(events);
        
        this.logger.debug('Events indexed for contract', {
          chainId,
          contractAddress,
          eventCount: events.length,
          fromBlock,
          toBlock,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to index events for contract', {
          chainId,
          contractAddress,
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Get contract events from blockchain
   */
  private async getContractEvents(
    chainId: ChainId,
    contractAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<BlockchainEvent[]> {
    const rpcUrl = this.getRpcUrl(chainId);
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }

    try {
      // This would use ethers.js or web3.js to get actual events
      // For now, return mock events
      const mockEvents: BlockchainEvent[] = [];
      const eventNames = ['Swap', 'Deposit', 'Withdraw', 'Transfer'];

      for (let block = fromBlock; block <= toBlock; block++) {
        if (Math.random() > 0.7) { // 30% chance of event per block
          mockEvents.push({
            id: `${chainId}-${contractAddress}-${block}-${Math.random()}`,
            blockNumber: block,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            contractAddress,
            eventName: eventNames[Math.floor(Math.random() * eventNames.length)] || 'Unknown',
            args: {
              user: `0x${Math.random().toString(16).substr(2, 40)}`,
              amount: (Math.random() * 1000).toString(),
              token: `0x${Math.random().toString(16).substr(2, 40)}`,
            },
            chainId,
            timestamp: Date.now() - (toBlock - block) * 15 * 1000, // 15 seconds per block
          });
        }
      }

      return mockEvents;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get contract events', {
        chainId,
        contractAddress,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Save events to database
   */
  private async saveEvents(events: BlockchainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const values = events.map(event => [
        event.id,
        event.chainId,
        event.blockNumber,
        event.transactionHash,
        0, // log_index - would be provided by actual event
        event.contractAddress,
        event.eventName,
        JSON.stringify(event.args),
        event.timestamp,
        Date.now(), // indexed_at
      ]);

      // Insert events in batches
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',');
        const flatValues = batch.flat();
        
        await this.queryDatabase(
          `INSERT OR IGNORE INTO blockchain_events 
           (id, chain_id, block_number, transaction_hash, log_index, 
            contract_address, event_name, event_args, block_timestamp, indexed_at) 
           VALUES ${placeholders}`,
          flatValues
        );
      }

      this.logger.debug('Events saved to database', { eventCount: events.length });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to save events', { 
        eventCount: events.length, 
        error: errorMessage 
      });
      throw error;
    }
  }

  /**
   * Update user balances based on events
   */
  async updateUserBalances(chainId: ChainId): Promise<void> {
    try {
      // Get recent transfer/swap events
      const events = await this.queryDatabase(
        `SELECT * FROM blockchain_events 
         WHERE chain_id = ? AND event_name IN ('Transfer', 'Swap', 'Deposit', 'Withdraw')
         ORDER BY block_number DESC LIMIT 1000`,
        [chainId]
      );

      // Process events and update balances
      for (const event of events.results || []) {
        await this.processEventForBalances(event);
      }

      this.logger.info('User balances updated', { 
        chainId, 
        eventsProcessed: events.results?.length || 0 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update user balances', { 
        chainId, 
        error: errorMessage 
      });
    }
  }

  /**
   * Process individual event for balance updates
   */
  private async processEventForBalances(event: any): Promise<void> {
    try {
      const args = JSON.parse(event.event_args || '{}');
      
      // Extract user and token info from event
      if (args.user && args.token && args.amount) {
        const currentBalance = await this.getUserBalance(args.user, args.token, event.chain_id);
        let newBalance = parseFloat(currentBalance);

        // Adjust balance based on event type
        switch (event.event_name) {
          case 'Deposit':
          case 'Transfer':
            newBalance += parseFloat(args.amount);
            break;
          case 'Withdraw':
            newBalance -= parseFloat(args.amount);
            break;
          case 'Swap':
            // Handle swap logic - would need input/output amounts
            break;
        }

        await this.updateUserBalance(
          args.user,
          args.token,
          event.chain_id,
          newBalance.toString(),
          event.block_number
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to process event for balances', { 
        eventId: event.id, 
        error: errorMessage 
      });
    }
  }

  /**
   * Get user balance for a token
   */
  private async getUserBalance(
    userAddress: string, 
    tokenAddress: string, 
    chainId: ChainId
  ): Promise<string> {
    try {
      const result = await this.queryDatabase(
        'SELECT balance FROM user_balances WHERE user_address = ? AND token_address = ? AND chain_id = ?',
        [userAddress, tokenAddress, chainId]
      );

      return result.results?.[0]?.balance || '0';

    } catch (error) {
      return '0';
    }
  }

  /**
   * Update user balance
   */
  private async updateUserBalance(
    userAddress: string,
    tokenAddress: string,
    chainId: ChainId,
    balance: string,
    blockNumber: number
  ): Promise<void> {
    await this.queryDatabase(
      `INSERT OR REPLACE INTO user_balances 
       (user_address, token_address, chain_id, balance, last_updated, block_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userAddress, tokenAddress, chainId, balance, Date.now(), blockNumber]
    );
  }

  /**
   * Get latest block number for a chain
   */
  private async getLatestBlockNumber(chainId: ChainId): Promise<number> {
    const rpcUrl = this.getRpcUrl(chainId);
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }

    try {
      // This would make actual RPC call to get latest block
      // For now, return mock block number
      return Math.floor(Date.now() / 15000); // Simulate block numbers

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get latest block number', { 
        chainId, 
        error: errorMessage 
      });
      throw error;
    }
  }

  /**
   * Update indexer status in database
   */
  private async updateIndexerStatus(
    chainId: ChainId,
    currentBlock: number,
    latestBlock: number
  ): Promise<void> {
    const syncLag = latestBlock - currentBlock;
    const isHealthy = syncLag < 10; // Consider healthy if less than 10 blocks behind

    await this.queryDatabase(
      `INSERT OR REPLACE INTO indexer_status 
       (chain_id, current_block, latest_block, last_sync_at, sync_lag, is_healthy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chainId, currentBlock, latestBlock, Date.now(), syncLag, isHealthy]
    );
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
   * Get all chain statuses
   */
  async getAllChainStatuses(): Promise<IndexerStatus[]> {
    const result = await this.queryDatabase('SELECT * FROM indexer_status');
    return result.results || [];
  }

  /**
   * Get total events indexed
   */
  private async getTotalEventsIndexed(): Promise<number> {
    const result = await this.queryDatabase('SELECT COUNT(*) as count FROM blockchain_events');
    return result.results?.[0]?.count || 0;
  }

  /**
   * Get recent events
   */
  async getRecentEvents(chainId?: ChainId, limit: number = 100): Promise<BlockchainEvent[]> {
    let sql = 'SELECT * FROM blockchain_events';
    const params: any[] = [];

    if (chainId !== undefined) {
      sql += ' WHERE chain_id = ?';
      params.push(chainId.toString());
    }

    sql += ' ORDER BY block_number DESC, indexed_at DESC LIMIT ?';
    params.push(limit.toString());

    const result = await this.queryDatabase(sql, params);
    return result.results || [];
  }

  /**
   * Get events by contract
   */
  async getEventsByContract(
    contractAddress: string, 
    chainId?: ChainId,
    limit: number = 100
  ): Promise<BlockchainEvent[]> {
    let sql = 'SELECT * FROM blockchain_events WHERE contract_address = ?';
    const params = [contractAddress];

    if (chainId !== undefined) {
      sql += ' AND chain_id = ?';
      params.push(chainId.toString());
    }

    sql += ' ORDER BY block_number DESC LIMIT ?';
    params.push(limit);

    const result = await this.queryDatabase(sql, params);
    return result.results || [];
  }

  /**
   * Get user balances
   */
  async getUserBalances(userAddress: string, chainId?: ChainId): Promise<BalanceInfo[]> {
    let sql = `SELECT ub.*, t.symbol, t.name, t.decimals 
               FROM user_balances ub 
               LEFT JOIN tokens t ON ub.token_address = t.address AND ub.chain_id = t.chain_id
               WHERE ub.user_address = ?`;
    const params = [userAddress];

    if (chainId !== undefined) {
      sql += ' AND ub.chain_id = ?';
      params.push(chainId);
    }

    sql += ' ORDER BY ub.last_updated DESC';

    const result = await this.queryDatabase(sql, params);
    return result.results || [];
  }
}