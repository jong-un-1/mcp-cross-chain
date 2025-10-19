-- Microservices Database Schema
-- Generated on: 2024-01-01
-- Version: 1.0.0

-- =================================================
-- CORE TABLES - Shared across microservices
-- =================================================

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  logo_uri TEXT,
  is_verified INTEGER DEFAULT 0,
  price_feed_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS tokens_address_chain_idx ON tokens(address, chain_id);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  wallet_type TEXT NOT NULL,
  owner_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS wallets_address_chain_idx ON wallets(address, chain_id);

-- =================================================
-- KEEPER SERVICE TABLES
-- =================================================

CREATE TABLE IF NOT EXISTS keeper_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  schedule_type TEXT NOT NULL,
  schedule_expression TEXT,
  target_data TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_run_at INTEGER,
  last_run_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS keeper_tasks_status_idx ON keeper_tasks(status);
CREATE INDEX IF NOT EXISTS keeper_tasks_next_run_idx ON keeper_tasks(next_run_at);

CREATE TABLE IF NOT EXISTS keeper_task_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  result_data TEXT,
  executed_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS keeper_task_history_task_id_idx ON keeper_task_history(task_id);

CREATE TABLE IF NOT EXISTS keeper_rebalancing (
  id TEXT PRIMARY KEY,
  source_chain_id INTEGER NOT NULL,
  target_chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  amount_from TEXT NOT NULL,
  amount_to TEXT NOT NULL,
  bridge_protocol TEXT NOT NULL,
  tx_hash_source TEXT,
  tx_hash_target TEXT,
  status TEXT DEFAULT 'pending',
  gas_used TEXT,
  fee_amount TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);

-- =================================================
-- FUNDER SERVICE TABLES
-- =================================================

CREATE TABLE IF NOT EXISTS funder_balances (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  balance TEXT NOT NULL,
  balance_usd REAL,
  last_updated INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS funder_balances_address_chain_token_idx 
  ON funder_balances(address, chain_id, token_address);

CREATE TABLE IF NOT EXISTS funder_thresholds (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  threshold_amount TEXT NOT NULL,
  top_up_amount TEXT NOT NULL,
  max_balance TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS funder_thresholds_chain_token_idx 
  ON funder_thresholds(chain_id, token_address);

CREATE TABLE IF NOT EXISTS funder_transactions (
  id TEXT PRIMARY KEY,
  target_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  gas_used TEXT,
  gas_price TEXT,
  fee_amount TEXT,
  block_number INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  confirmed_at INTEGER
);

CREATE INDEX IF NOT EXISTS funder_transactions_status_idx ON funder_transactions(status);
CREATE INDEX IF NOT EXISTS funder_transactions_tx_hash_idx ON funder_transactions(tx_hash);

-- =================================================
-- INDEXER SERVICE TABLES
-- =================================================

CREATE TABLE IF NOT EXISTS indexer_events (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_signature TEXT NOT NULL,
  event_data TEXT,
  decoded_data TEXT,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS indexer_events_chain_tx_log_idx 
  ON indexer_events(chain_id, transaction_hash, log_index);
CREATE INDEX IF NOT EXISTS indexer_events_block_number_idx ON indexer_events(block_number);

CREATE TABLE IF NOT EXISTS indexer_sync_status (
  chain_id INTEGER PRIMARY KEY,
  last_synced_block INTEGER NOT NULL,
  target_block INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'syncing',
  error_message TEXT,
  blocks_per_second REAL,
  estimated_completion INTEGER,
  last_update INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS indexer_user_balances (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  token_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  balance TEXT NOT NULL,
  locked_balance TEXT DEFAULT '0',
  pending_balance TEXT DEFAULT '0',
  last_transaction_hash TEXT,
  last_updated_block INTEGER NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS indexer_user_balances_user_token_chain_idx 
  ON indexer_user_balances(user_address, token_address, chain_id);

-- =================================================
-- WATCHER SERVICE TABLES
-- =================================================

CREATE TABLE IF NOT EXISTS watcher_metrics (
  id TEXT PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  labels TEXT,
  service_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS watcher_metrics_metric_name_idx ON watcher_metrics(metric_name);
CREATE INDEX IF NOT EXISTS watcher_metrics_service_name_idx ON watcher_metrics(service_name);
CREATE INDEX IF NOT EXISTS watcher_metrics_timestamp_idx ON watcher_metrics(timestamp);

CREATE TABLE IF NOT EXISTS watcher_alert_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  condition_operator TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  duration_seconds INTEGER DEFAULT 60,
  severity TEXT DEFAULT 'warning',
  message_template TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS watcher_alerts (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  alert_status TEXT DEFAULT 'firing',
  metric_value REAL NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- =================================================
-- QUOTER SERVICE TABLES
-- =================================================

CREATE TABLE IF NOT EXISTS price_feeds (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  price_usd TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS price_feeds_token_chain_idx ON price_feeds(token_address, chain_id);
CREATE INDEX IF NOT EXISTS price_feeds_timestamp_idx ON price_feeds(timestamp);

CREATE TABLE IF NOT EXISTS gas_prices (
  chain_id INTEGER NOT NULL,
  fast TEXT NOT NULL,
  standard TEXT NOT NULL,
  safe TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (chain_id, timestamp)
);

CREATE TABLE IF NOT EXISTS liquidity_pools (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  reserve0 TEXT NOT NULL,
  reserve1 TEXT NOT NULL,
  total_supply TEXT NOT NULL,
  fee_rate INTEGER NOT NULL,
  last_updated_block INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS liquidity_pools_address_chain_idx ON liquidity_pools(address, chain_id);
CREATE INDEX IF NOT EXISTS liquidity_pools_protocol_idx ON liquidity_pools(protocol);

CREATE TABLE IF NOT EXISTS quote_history (
  id TEXT PRIMARY KEY,
  input_token TEXT NOT NULL,
  output_token TEXT NOT NULL,
  input_amount TEXT NOT NULL,
  output_amount TEXT NOT NULL,
  price_impact REAL NOT NULL,
  gas_estimate TEXT NOT NULL,
  route_data TEXT,
  slippage_tolerance REAL NOT NULL,
  user_address TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS quote_history_input_token_idx ON quote_history(input_token);
CREATE INDEX IF NOT EXISTS quote_history_user_address_idx ON quote_history(user_address);

-- =================================================
-- INSERT INITIAL DATA
-- =================================================

-- Insert some test tokens
INSERT OR IGNORE INTO tokens (
  id, address, symbol, name, decimals, chain_id, is_verified
) VALUES 
('eth-1', '0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18, 1, 1),
('usdc-1', '0xa0b86a33e6c0c4c99c8481c4ee5e3e6a59f95ba5', 'USDC', 'USD Coin', 6, 1, 1),
('usdt-1', '0xdac17f958d2ee523a2206206994597c13d831ec7', 'USDT', 'Tether USD', 6, 1, 1);

-- Insert initial sync status for supported chains
INSERT OR IGNORE INTO indexer_sync_status (
  chain_id, last_synced_block, target_block, sync_status
) VALUES 
(1, 0, 0, 'initializing'),      -- Ethereum
(56, 0, 0, 'initializing'),     -- BSC  
(137, 0, 0, 'initializing'),    -- Polygon
(42161, 0, 0, 'initializing'),  -- Arbitrum
(10, 0, 0, 'initializing');     -- Optimism

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000000;
PRAGMA foreign_keys = true;
PRAGMA temp_store = memory;