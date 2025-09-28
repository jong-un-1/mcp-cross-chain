import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';

// =================================================
// CORE TABLES - Shared across microservices  
// =================================================

export const tokens = sqliteTable('tokens', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  decimals: integer('decimals').notNull(),
  chainId: integer('chain_id').notNull(),
  logoUri: text('logo_uri'),
  isVerified: integer('is_verified').default(0),
  priceFeedId: text('price_feed_id'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  addressChainIdx: index('tokens_address_chain_idx').on(table.address, table.chainId),
}));

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  chainId: integer('chain_id').notNull(),
  walletType: text('wallet_type').notNull(),
  ownerId: text('owner_id'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  addressChainIdx: index('wallets_address_chain_idx').on(table.address, table.chainId),
}));

// =================================================
// KEEPER SERVICE TABLES
// =================================================

export const keeperTasks = sqliteTable('keeper_tasks', {
  id: text('id').primaryKey(),
  taskType: text('task_type').notNull(),
  status: text('status').default('pending'),
  priority: integer('priority').default(5),
  scheduleType: text('schedule_type').notNull(),
  scheduleExpression: text('schedule_expression'),
  targetData: text('target_data'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRunAt: integer('next_run_at'),
  lastRunAt: integer('last_run_at'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  statusIdx: index('keeper_tasks_status_idx').on(table.status),
  nextRunIdx: index('keeper_tasks_next_run_idx').on(table.nextRunAt),
}));

export const keeperTaskHistory = sqliteTable('keeper_task_history', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  executionStatus: text('execution_status').notNull(),
  executionTimeMs: integer('execution_time_ms'),
  errorMessage: text('error_message'),
  resultData: text('result_data'),
  executedAt: integer('executed_at').default(sql`(unixepoch())`),
}, (table) => ({
  taskIdIdx: index('keeper_task_history_task_id_idx').on(table.taskId),
}));

export const keeperRebalancing = sqliteTable('keeper_rebalancing', {
  id: text('id').primaryKey(),
  sourceChainId: integer('source_chain_id').notNull(),
  targetChainId: integer('target_chain_id').notNull(),
  tokenAddress: text('token_address').notNull(),
  amountFrom: text('amount_from').notNull(),
  amountTo: text('amount_to').notNull(),
  bridgeProtocol: text('bridge_protocol').notNull(),
  txHashSource: text('tx_hash_source'),
  txHashTarget: text('tx_hash_target'),
  status: text('status').default('pending'),
  gasUsed: text('gas_used'),
  feeAmount: text('fee_amount'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  completedAt: integer('completed_at'),
});

// =================================================
// FUNDER SERVICE TABLES
// =================================================

export const funderBalances = sqliteTable('funder_balances', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  chainId: integer('chain_id').notNull(),
  tokenAddress: text('token_address').notNull(),
  balance: text('balance').notNull(),
  balanceUsd: real('balance_usd'),
  lastUpdated: integer('last_updated').default(sql`(unixepoch())`),
}, (table) => ({
  addressChainTokenIdx: index('funder_balances_address_chain_token_idx')
    .on(table.address, table.chainId, table.tokenAddress),
}));

export const funderThresholds = sqliteTable('funder_thresholds', {
  id: text('id').primaryKey(),
  chainId: integer('chain_id').notNull(),
  tokenAddress: text('token_address').notNull(),
  thresholdAmount: text('threshold_amount').notNull(),
  topUpAmount: text('top_up_amount').notNull(),
  maxBalance: text('max_balance'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  chainTokenIdx: index('funder_thresholds_chain_token_idx').on(table.chainId, table.tokenAddress),
}));

export const funderTransactions = sqliteTable('funder_transactions', {
  id: text('id').primaryKey(),
  targetAddress: text('target_address').notNull(),
  chainId: integer('chain_id').notNull(),
  tokenAddress: text('token_address').notNull(),
  amount: text('amount').notNull(),
  txHash: text('tx_hash'),
  status: text('status').default('pending'),
  gasUsed: text('gas_used'),
  gasPrice: text('gas_price'),
  feeAmount: text('fee_amount'),
  blockNumber: integer('block_number'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  confirmedAt: integer('confirmed_at'),
}, (table) => ({
  statusIdx: index('funder_transactions_status_idx').on(table.status),
  txHashIdx: index('funder_transactions_tx_hash_idx').on(table.txHash),
}));

// =================================================
// INDEXER SERVICE TABLES
// =================================================

export const indexerEvents = sqliteTable('indexer_events', {
  id: text('id').primaryKey(),
  chainId: integer('chain_id').notNull(),
  blockNumber: integer('block_number').notNull(),
  transactionHash: text('transaction_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  contractAddress: text('contract_address').notNull(),
  eventName: text('event_name').notNull(),
  eventSignature: text('event_signature').notNull(),
  eventData: text('event_data'),
  decodedData: text('decoded_data'),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  chainTxLogIdx: index('indexer_events_chain_tx_log_idx')
    .on(table.chainId, table.transactionHash, table.logIndex),
  blockNumberIdx: index('indexer_events_block_number_idx').on(table.blockNumber),
}));

export const indexerSyncStatus = sqliteTable('indexer_sync_status', {
  chainId: integer('chain_id').primaryKey(),
  lastSyncedBlock: integer('last_synced_block').notNull(),
  targetBlock: integer('target_block').notNull(),
  syncStatus: text('sync_status').default('syncing'),
  errorMessage: text('error_message'),
  blocksPerSecond: real('blocks_per_second'),
  estimatedCompletion: integer('estimated_completion'),
  lastUpdate: integer('last_update').default(sql`(unixepoch())`),
});

export const indexerUserBalances = sqliteTable('indexer_user_balances', {
  id: text('id').primaryKey(),
  userAddress: text('user_address').notNull(),
  tokenAddress: text('token_address').notNull(),
  chainId: integer('chain_id').notNull(),
  balance: text('balance').notNull(),
  lockedBalance: text('locked_balance').default('0'),
  pendingBalance: text('pending_balance').default('0'),
  lastTransactionHash: text('last_transaction_hash'),
  lastUpdatedBlock: integer('last_updated_block').notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  userTokenChainIdx: index('indexer_user_balances_user_token_chain_idx')
    .on(table.userAddress, table.tokenAddress, table.chainId),
}));

// =================================================
// WATCHER SERVICE TABLES
// =================================================

export const watcherMetrics = sqliteTable('watcher_metrics', {
  id: text('id').primaryKey(),
  metricName: text('metric_name').notNull(),
  metricType: text('metric_type').notNull(),
  value: real('value').notNull(),
  labels: text('labels'),
  serviceName: text('service_name').notNull(),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  metricNameIdx: index('watcher_metrics_metric_name_idx').on(table.metricName),
  serviceNameIdx: index('watcher_metrics_service_name_idx').on(table.serviceName),
  timestampIdx: index('watcher_metrics_timestamp_idx').on(table.timestamp),
}));

export const watcherAlertRules = sqliteTable('watcher_alert_rules', {
  id: text('id').primaryKey(),
  ruleName: text('rule_name').notNull(),
  metricName: text('metric_name').notNull(),
  conditionOperator: text('condition_operator').notNull(),
  thresholdValue: real('threshold_value').notNull(),
  durationSeconds: integer('duration_seconds').default(60),
  severity: text('severity').default('warning'),
  messageTemplate: text('message_template').notNull(),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

export const watcherAlerts = sqliteTable('watcher_alerts', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull(),
  alertStatus: text('alert_status').default('firing'),
  metricValue: real('metric_value').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(),
  startedAt: integer('started_at').notNull(),
  resolvedAt: integer('resolved_at'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// =================================================
// QUOTER SERVICE TABLES
// =================================================

export const priceFeeds = sqliteTable('price_feeds', {
  id: text('id').primaryKey(),
  tokenAddress: text('token_address').notNull(),
  chainId: integer('chain_id').notNull(),
  priceUsd: text('price_usd').notNull(),
  source: text('source').notNull(),
  confidence: real('confidence').default(1.0),
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  tokenChainIdx: index('price_feeds_token_chain_idx').on(table.tokenAddress, table.chainId),
  timestampIdx: index('price_feeds_timestamp_idx').on(table.timestamp),
}));

export const gasPrices = sqliteTable('gas_prices', {
  chainId: integer('chain_id').notNull(),
  fast: text('fast').notNull(),
  standard: text('standard').notNull(),
  safe: text('safe').notNull(),
  timestamp: integer('timestamp').notNull(),
  source: text('source').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  pk: primaryKey({ columns: [table.chainId, table.timestamp] }),
}));

export const liquidityPools = sqliteTable('liquidity_pools', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  chainId: integer('chain_id').notNull(),
  protocol: text('protocol').notNull(),
  token0Address: text('token0_address').notNull(),
  token1Address: text('token1_address').notNull(),
  reserve0: text('reserve0').notNull(),
  reserve1: text('reserve1').notNull(),
  totalSupply: text('total_supply').notNull(),
  feeRate: integer('fee_rate').notNull(),
  lastUpdatedBlock: integer('last_updated_block').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
}, (table) => ({
  addressChainIdx: index('liquidity_pools_address_chain_idx').on(table.address, table.chainId),
  protocolIdx: index('liquidity_pools_protocol_idx').on(table.protocol),
}));

export const quoteHistory = sqliteTable('quote_history', {
  id: text('id').primaryKey(),
  inputToken: text('input_token').notNull(),
  outputToken: text('output_token').notNull(),
  inputAmount: text('input_amount').notNull(),
  outputAmount: text('output_amount').notNull(),
  priceImpact: real('price_impact').notNull(),
  gasEstimate: text('gas_estimate').notNull(),
  routeData: text('route_data'),
  slippageTolerance: real('slippage_tolerance').notNull(),
  userAddress: text('user_address'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  inputTokenIdx: index('quote_history_input_token_idx').on(table.inputToken),
  userAddressIdx: index('quote_history_user_address_idx').on(table.userAddress),
}));

// =================================================
// TYPE EXPORTS
// =================================================

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

// Keeper types
export type KeeperTask = typeof keeperTasks.$inferSelect;
export type NewKeeperTask = typeof keeperTasks.$inferInsert;

export type KeeperTaskHistory = typeof keeperTaskHistory.$inferSelect;
export type NewKeeperTaskHistory = typeof keeperTaskHistory.$inferInsert;

export type KeeperRebalancing = typeof keeperRebalancing.$inferSelect;
export type NewKeeperRebalancing = typeof keeperRebalancing.$inferInsert;

// Funder types
export type FunderBalance = typeof funderBalances.$inferSelect;
export type NewFunderBalance = typeof funderBalances.$inferInsert;

export type FunderThreshold = typeof funderThresholds.$inferSelect;
export type NewFunderThreshold = typeof funderThresholds.$inferInsert;

export type FunderTransaction = typeof funderTransactions.$inferSelect;
export type NewFunderTransaction = typeof funderTransactions.$inferInsert;

// Indexer types
export type IndexerEvent = typeof indexerEvents.$inferSelect;
export type NewIndexerEvent = typeof indexerEvents.$inferInsert;

export type IndexerSyncStatus = typeof indexerSyncStatus.$inferSelect;
export type NewIndexerSyncStatus = typeof indexerSyncStatus.$inferInsert;

export type IndexerUserBalance = typeof indexerUserBalances.$inferSelect;
export type NewIndexerUserBalance = typeof indexerUserBalances.$inferInsert;

// Watcher types
export type WatcherMetric = typeof watcherMetrics.$inferSelect;
export type NewWatcherMetric = typeof watcherMetrics.$inferInsert;

export type WatcherAlertRule = typeof watcherAlertRules.$inferSelect;
export type NewWatcherAlertRule = typeof watcherAlertRules.$inferInsert;

export type WatcherAlert = typeof watcherAlerts.$inferSelect;
export type NewWatcherAlert = typeof watcherAlerts.$inferInsert;

// Quoter types
export type PriceFeed = typeof priceFeeds.$inferSelect;
export type NewPriceFeed = typeof priceFeeds.$inferInsert;

export type GasPrice = typeof gasPrices.$inferSelect;
export type NewGasPrice = typeof gasPrices.$inferInsert;

export type LiquidityPool = typeof liquidityPools.$inferSelect;
export type NewLiquidityPool = typeof liquidityPools.$inferInsert;

export type QuoteHistory = typeof quoteHistory.$inferSelect;
export type NewQuoteHistory = typeof quoteHistory.$inferInsert;