-- Cross-Chain DEX Microservices Database Schema
-- Version: 3.0.0
-- Created: 2025-09-28
-- Architecture: Microservices (Keeper, Funder, Indexer, Watcher, Quoter)

-- =================================================
-- CORE TABLES - Shared across microservices
-- =================================================

-- Supported tokens across all chains
CREATE TABLE `tokens` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `address` TEXT NOT NULL,
    `symbol` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `decimals` INTEGER NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `logo_uri` TEXT,
    `is_verified` INTEGER DEFAULT 0,
    `price_feed_id` TEXT,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`address`, `chain_id`)
);

-- User wallets and addresses
CREATE TABLE `wallets` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `wallet_type` TEXT NOT NULL, -- 'eoa', 'multisig', 'smart_contract'
    `owner_id` TEXT,
    `is_active` INTEGER DEFAULT 1,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`address`, `chain_id`)
);

-- =================================================
-- KEEPER SERVICE TABLES
-- =================================================

-- Scheduled tasks and automation
CREATE TABLE `keeper_tasks` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `task_type` TEXT NOT NULL, -- 'rebalance', 'order_execution', 'funding', 'cleanup'
    `status` TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    `priority` INTEGER DEFAULT 5, -- 1-10, lower = higher priority
    `schedule_type` TEXT NOT NULL, -- 'immediate', 'cron', 'interval', 'once'
    `schedule_expression` TEXT, -- cron expression or interval
    `target_data` TEXT, -- JSON data for task execution
    `retry_count` INTEGER DEFAULT 0,
    `max_retries` INTEGER DEFAULT 3,
    `next_run_at` INTEGER,
    `last_run_at` INTEGER,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Task execution history
CREATE TABLE `keeper_task_history` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `task_id` TEXT NOT NULL,
    `execution_status` TEXT NOT NULL, -- 'success', 'failure', 'timeout'
    `execution_time_ms` INTEGER,
    `error_message` TEXT,
    `result_data` TEXT, -- JSON result
    `executed_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`task_id`) REFERENCES `keeper_tasks`(`id`)
);

-- Liquidity rebalancing records
CREATE TABLE `keeper_rebalancing` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `source_chain_id` INTEGER NOT NULL,
    `target_chain_id` INTEGER NOT NULL,
    `token_address` TEXT NOT NULL,
    `amount_from` TEXT NOT NULL,
    `amount_to` TEXT NOT NULL,
    `bridge_protocol` TEXT NOT NULL, -- 'stargate', 'wormhole', 'across', etc.
    `tx_hash_source` TEXT,
    `tx_hash_target` TEXT,
    `status` TEXT DEFAULT 'pending',
    `gas_used` TEXT,
    `fee_amount` TEXT,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `completed_at` INTEGER
);

-- =================================================
-- FUNDER SERVICE TABLES  
-- =================================================

-- Address balances across chains
CREATE TABLE `funder_balances` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `token_address` TEXT NOT NULL,
    `balance` TEXT NOT NULL, -- wei/smallest unit
    `balance_usd` REAL,
    `last_updated` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`address`, `chain_id`, `token_address`)
);

-- Funding thresholds configuration
CREATE TABLE `funder_thresholds` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `token_address` TEXT NOT NULL,
    `threshold_amount` TEXT NOT NULL, -- minimum balance before funding
    `top_up_amount` TEXT NOT NULL, -- amount to add when funding
    `max_balance` TEXT, -- maximum balance to maintain
    `is_active` INTEGER DEFAULT 1,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`chain_id`, `token_address`)
);

-- Funding transactions history
CREATE TABLE `funder_transactions` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `target_address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `token_address` TEXT NOT NULL,
    `amount` TEXT NOT NULL,
    `tx_hash` TEXT,
    `status` TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    `gas_used` TEXT,
    `gas_price` TEXT,
    `fee_amount` TEXT,
    `block_number` INTEGER,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `confirmed_at` INTEGER
);

-- =================================================
-- INDEXER SERVICE TABLES
-- =================================================

-- Blockchain events indexing
CREATE TABLE `indexer_events` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `block_number` INTEGER NOT NULL,
    `transaction_hash` TEXT NOT NULL,
    `log_index` INTEGER NOT NULL,
    `contract_address` TEXT NOT NULL,
    `event_name` TEXT NOT NULL,
    `event_signature` TEXT NOT NULL,
    `event_data` TEXT, -- JSON encoded event data
    `decoded_data` TEXT, -- Human readable decoded data
    `timestamp` INTEGER NOT NULL,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`chain_id`, `transaction_hash`, `log_index`)
);

-- Sync status for each chain
CREATE TABLE `indexer_sync_status` (
    `chain_id` INTEGER PRIMARY KEY NOT NULL,
    `last_synced_block` INTEGER NOT NULL,
    `target_block` INTEGER NOT NULL,
    `sync_status` TEXT DEFAULT 'syncing', -- 'syncing', 'synced', 'error'
    `error_message` TEXT,
    `blocks_per_second` REAL,
    `estimated_completion` INTEGER,
    `last_update` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- User portfolio balances (aggregated from events)
CREATE TABLE `indexer_user_balances` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `user_address` TEXT NOT NULL,
    `token_address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `balance` TEXT NOT NULL,
    `locked_balance` TEXT DEFAULT '0',
    `pending_balance` TEXT DEFAULT '0',
    `last_transaction_hash` TEXT,
    `last_updated_block` INTEGER NOT NULL,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`user_address`, `token_address`, `chain_id`)
);

-- =================================================
-- WATCHER SERVICE TABLES
-- =================================================

-- System metrics collection
CREATE TABLE `watcher_metrics` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `metric_name` TEXT NOT NULL,
    `metric_type` TEXT NOT NULL, -- 'counter', 'gauge', 'histogram', 'summary'
    `value` REAL NOT NULL,
    `labels` TEXT, -- JSON encoded labels
    `service_name` TEXT NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Alert rules configuration
CREATE TABLE `watcher_alert_rules` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `rule_name` TEXT NOT NULL,
    `metric_name` TEXT NOT NULL,
    `condition_operator` TEXT NOT NULL, -- '>', '<', '>=', '<=', '==', '!='
    `threshold_value` REAL NOT NULL,
    `duration_seconds` INTEGER DEFAULT 60, -- alert after X seconds
    `severity` TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    `message_template` TEXT NOT NULL,
    `is_active` INTEGER DEFAULT 1,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Active alerts
CREATE TABLE `watcher_alerts` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `rule_id` TEXT NOT NULL,
    `alert_status` TEXT DEFAULT 'firing', -- 'firing', 'resolved'
    `metric_value` REAL NOT NULL,
    `message` TEXT NOT NULL,
    `severity` TEXT NOT NULL,
    `started_at` INTEGER NOT NULL,
    `resolved_at` INTEGER,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`rule_id`) REFERENCES `watcher_alert_rules`(`id`)
);

-- =================================================
-- QUOTER SERVICE TABLES
-- =================================================

-- Price feeds from multiple sources
CREATE TABLE `price_feeds` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `token_address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `price_usd` TEXT NOT NULL,
    `source` TEXT NOT NULL, -- 'codex', 'tenderly', 'ethers', 'chainlink'
    `confidence` REAL DEFAULT 1.0, -- 0.0 to 1.0
    `timestamp` INTEGER NOT NULL,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Gas prices for each chain
CREATE TABLE `gas_prices` (
    `chain_id` INTEGER NOT NULL,
    `fast` TEXT NOT NULL, -- in Gwei
    `standard` TEXT NOT NULL,
    `safe` TEXT NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `source` TEXT NOT NULL,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`chain_id`, `timestamp`)
);

-- Liquidity pools information
CREATE TABLE `liquidity_pools` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `address` TEXT NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `protocol` TEXT NOT NULL, -- 'uniswap-v2', 'uniswap-v3', 'sushiswap', etc.
    `token0_address` TEXT NOT NULL,
    `token1_address` TEXT NOT NULL,
    `reserve0` TEXT NOT NULL,
    `reserve1` TEXT NOT NULL,
    `total_supply` TEXT NOT NULL,
    `fee_rate` INTEGER NOT NULL, -- in basis points (e.g., 30 = 0.3%)
    `last_updated_block` INTEGER NOT NULL,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    `updated_at` INTEGER DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`address`, `chain_id`)
);

-- Quote history for analytics
CREATE TABLE `quote_history` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `input_token` TEXT NOT NULL,
    `output_token` TEXT NOT NULL,
    `input_amount` TEXT NOT NULL,
    `output_amount` TEXT NOT NULL,
    `price_impact` REAL NOT NULL,
    `gas_estimate` TEXT NOT NULL,
    `route_data` TEXT, -- JSON encoded route
    `slippage_tolerance` REAL NOT NULL,
    `user_address` TEXT,
    `created_at` INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- =================================================
-- INDEXES for performance
-- =================================================

-- Core indexes
CREATE INDEX `idx_tokens_chain_symbol` ON `tokens`(`chain_id`, `symbol`);
CREATE INDEX `idx_wallets_address_chain` ON `wallets`(`address`, `chain_id`);

-- Keeper indexes
CREATE INDEX `idx_keeper_tasks_status_next_run` ON `keeper_tasks`(`status`, `next_run_at`);
CREATE INDEX `idx_keeper_task_history_task_id` ON `keeper_task_history`(`task_id`);

-- Funder indexes  
CREATE INDEX `idx_funder_balances_address_chain` ON `funder_balances`(`address`, `chain_id`);
CREATE INDEX `idx_funder_transactions_status` ON `funder_transactions`(`status`);

-- Indexer indexes
CREATE INDEX `idx_indexer_events_chain_block` ON `indexer_events`(`chain_id`, `block_number`);
CREATE INDEX `idx_indexer_events_contract_event` ON `indexer_events`(`contract_address`, `event_name`);
CREATE INDEX `idx_indexer_user_balances_user` ON `indexer_user_balances`(`user_address`);

-- Watcher indexes
CREATE INDEX `idx_watcher_metrics_name_timestamp` ON `watcher_metrics`(`metric_name`, `timestamp`);
CREATE INDEX `idx_watcher_alerts_status` ON `watcher_alerts`(`alert_status`);

-- Quoter indexes
CREATE INDEX `idx_price_feeds_token_chain_timestamp` ON `price_feeds`(`token_address`, `chain_id`, `timestamp`);
CREATE INDEX `idx_gas_prices_chain_timestamp` ON `gas_prices`(`chain_id`, `timestamp`);
CREATE INDEX `idx_liquidity_pools_tokens` ON `liquidity_pools`(`token0_address`, `token1_address`);