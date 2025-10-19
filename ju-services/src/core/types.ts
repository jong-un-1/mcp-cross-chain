/**
 * Core Types for Cross-Chain DEX System
 * Based on the architecture diagram with 5 main services:
 * Keeper, Funder, Indexer, Watcher, Quoter
 */

// Environment configuration
export interface Env {
  // Cloudflare bindings
  AI?: Ai;
  D1_DATABASE?: D1Database;
  R2?: R2Bucket;
  KV?: KVNamespace;
  
  // Configuration
  KEY: string;
  NODE_ENV?: string;
  
  // Blockchain configuration
  ETHEREUM_RPC_URL?: string;
  SOLANA_RPC_URL?: string;
  BSC_RPC_URL?: string;
  POLYGON_RPC_URL?: string;
  ARBITRUM_RPC_URL?: string;
  OPTIMISM_RPC_URL?: string;
  
  // External services
  SUBGRAPH_URL?: string;
  LIT_NETWORK_RPC?: string;
  PROMETHEUS_ENDPOINT?: string;
  
  // API Keys
  CODEX_API_KEY?: string;
  TENDERLY_API_KEY?: string;
  ETHERS_API_KEY?: string;
}

// Supported blockchain networks
export enum ChainId {
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  SOLANA = 900, // Custom ID for Solana
}

export interface Chain {
  id: ChainId;
  name: string;
  rpcUrl: string;
  nativeToken: string;
  blockTime: number; // seconds
}

// Token definition
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: ChainId;
  logoURI?: string;
}

// Order types
export interface Order {
  id: string;
  user: string;
  inputToken: Token;
  outputToken: Token;
  inputAmount: string;
  minOutputAmount: string;
  deadline: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  txHash?: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Price and liquidity
export interface Quote {
  inputToken: Token;
  outputToken: Token;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  fee: string;
  gasEstimate: string;
  route: SwapRoute[];
}

export interface SwapRoute {
  protocol: string;
  pool: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
}

// Liquidity management
export interface LiquidityPool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number;
  chainId: ChainId;
}

export interface BalanceInfo {
  address: string;
  token: Token;
  balance: string;
  lastUpdated: number;
}

// Metrics and monitoring
export interface SystemMetrics {
  timestamp: number;
  totalVolume24h: string;
  totalUsers: number;
  activePools: number;
  pendingOrders: number;
  systemHealth: HealthStatus;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Service-specific types

// Keeper service types
export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron expression
  lastRun: number;
  nextRun: number;
  status: TaskStatus;
}

export enum TaskStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  FAILED = 'failed',
}

export interface RebalanceConfig {
  minThreshold: number;
  maxThreshold: number;
  targetRatio: number;
  chains: ChainId[];
}

// Funder service types
export interface FundingConfig {
  minEthBalance: string;
  minSolBalance: string;
  fundingThreshold: number;
  maxFundingAmount: string;
}

export interface AddressFunding {
  address: string;
  chain: ChainId;
  balance: string;
  threshold: string;
  needsFunding: boolean;
}

// Indexer service types
export interface BlockchainEvent {
  id: string;
  blockNumber: number;
  transactionHash: string;
  contractAddress: string;
  eventName: string;
  args: Record<string, any>;
  chainId: ChainId;
  timestamp: number;
}

export interface IndexerStatus {
  chainId: ChainId;
  currentBlock: number;
  latestBlock: number;
  isHealthy: boolean;
  lastSync: number;
}

// Watcher service types
export interface MetricPoint {
  metric: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface AlertRule {
  id: string;
  metric: string;
  condition: string; // e.g., '> 100'
  duration: number; // seconds
  severity: AlertSeverity;
  enabled: boolean;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Quoter service types
export interface PriceSource {
  name: string;
  price: string;
  timestamp: number;
  confidence: number; // 0-1
}

export interface GasPrice {
  chainId: ChainId;
  fast: string;
  standard: string;
  safe: string;
  timestamp: number;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

// Cache types
export interface CacheConfig {
  ttl: number; // seconds
  strategy: CacheStrategy;
}

export enum CacheStrategy {
  STATIC = 'static',
  POOLS = 'pools',
  PRICE = 'price',
  USER = 'user',
  ANALYTICS = 'analytics',
  HEALTH = 'health',
  METADATA = 'metadata',
}

// Error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ChainError extends ServiceError {
  constructor(message: string, public chainId: ChainId) {
    super(message, 'chain', 'CHAIN_ERROR', 503);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, public field: string) {
    super(message, 'validation', 'VALIDATION_ERROR', 400);
  }
}