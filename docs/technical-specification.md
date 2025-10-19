# Technical Specification Document
# 技术规范文档 - API设计、数据结构和集成接口

## 概述

本文档定义了基于Lit Protocol MPC网络的跨链自动化系统的详细技术规范，包括API接口设计、数据结构定义、集成标准和开发规范。

## 1. 核心数据结构定义

### 1.1 基础类型定义

```typescript
// ju-actions/src/types/core.ts

/**
 * 支持的区块链网络
 */
export enum ChainId {
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  SOLANA = 900, // 自定义ID
}

/**
 * 区块链网络配置
 */
export interface ChainConfig {
  id: ChainId;
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  nativeToken: string;
  gasToken: string;
  blockTime: number; // 秒
  confirmations: number;
  maxGasPrice: bigint;
}

/**
 * 统一地址格式
 */
export interface UniversalAddress {
  chainId: ChainId;
  address: string;
  type: 'eoa' | 'contract' | 'program'; // EOA, Contract, Solana Program
  verified?: boolean;
}

/**
 * 代币信息
 */
export interface TokenInfo {
  address: UniversalAddress;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  verified: boolean;
}
```

### 1.2 PKP相关数据结构

```typescript
// ju-actions/src/types/pkp.ts

/**
 * 增强版PKP定义
 */
export interface EnhancedPKP {
  // 基础信息
  pkpId: string;
  publicKey: string;
  pkpNFTId?: string;
  
  // 多链地址映射
  chainAddresses: Map<ChainId, string>;
  
  // 权限配置
  permissions: PKPPermissions;
  
  // 自动化配置
  automation: AutomationConfig;
  
  // 安全配置
  security: SecurityConfig;
  
  // 状态和指标
  status: PKPStatus;
  metrics: PKPMetrics;
  
  // 元数据
  metadata: PKPMetadata;
}

/**
 * PKP权限配置
 */
export interface PKPPermissions {
  // 基础权限
  allowedChains: ChainId[];
  allowedContracts: ContractPermission[];
  allowedMethods: MethodPermission[];
  
  // 自动化权限
  automaticSigning: boolean;
  conditionRules: ConditionRule[];
  
  // 资源限制
  gasLimits: Map<ChainId, bigint>;
  dailyLimits: Map<ChainId, bigint>;
  rateLimits: RateLimit[];
  
  // 时间限制
  timeRestrictions: TimeRestriction[];
}

/**
 * 合约权限定义
 */
export interface ContractPermission {
  chainId: ChainId;
  contractAddress: string;
  allowedMethods: string[]; // 方法签名数组
  gasLimit: bigint;
  valueLimit: bigint; // 最大交易金额
  enabled: boolean;
}

/**
 * 方法权限定义
 */
export interface MethodPermission {
  signature: string; // 方法签名 e.g., "transfer(address,uint256)"
  parameterConstraints: ParameterConstraint[];
  gasLimit: bigint;
  cooldownPeriod: number; // 毫秒
}

/**
 * 参数约束
 */
export interface ParameterConstraint {
  parameterIndex: number;
  parameterName: string;
  constraint: {
    type: 'range' | 'whitelist' | 'blacklist' | 'regex';
    value: any;
  };
}

/**
 * 频率限制
 */
export interface RateLimit {
  operation: string; // 操作类型标识
  maxCount: number; // 最大次数
  timeWindow: number; // 时间窗口(毫秒)
  currentCount: number;
  windowStart: number;
}

/**
 * PKP状态枚举
 */
export enum PKPStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

/**
 * PKP指标
 */
export interface PKPMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: bigint;
  lastActivity: number;
  averageResponseTime: number;
  riskScore: number; // 0-100
}
```

### 1.3 条件执行相关数据结构

```typescript
// ju-actions/src/types/conditions.ts

/**
 * 条件规则定义
 */
export interface ConditionRule {
  id: string;
  name: string;
  description: string;
  
  // 触发条件
  trigger: TriggerCondition;
  
  // 执行动作
  actions: AutomationAction[];
  
  // 规则配置
  config: RuleConfig;
  
  // 状态
  status: RuleStatus;
  
  // 统计
  stats: RuleStats;
}

/**
 * 触发条件
 */
export interface TriggerCondition {
  // 事件条件
  eventConditions: EventCondition[];
  
  // 时间条件
  timeConditions: TimeCondition[];
  
  // 状态条件
  stateConditions: StateCondition[];
  
  // 复合条件
  compositeConditions?: CompositeCondition;
  
  // 条件逻辑 (AND/OR)
  logic: 'AND' | 'OR';
}

/**
 * 事件条件
 */
export interface EventCondition {
  chainId: ChainId;
  contractAddress?: string;
  eventSignature: string;
  parameterFilters: ParameterFilter[];
  blockRange?: BlockRange;
}

/**
 * 参数过滤器
 */
export interface ParameterFilter {
  parameterName: string;
  parameterIndex: number;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

/**
 * 时间条件
 */
export interface TimeCondition {
  type: 'after' | 'before' | 'between' | 'dayOfWeek' | 'timeOfDay' | 'cooldown';
  
  // 绝对时间
  timestamp?: number;
  startTime?: number;
  endTime?: number;
  
  // 相对时间
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  startHour?: number;
  endHour?: number;
  
  // 冷却期
  cooldownPeriod?: number; // 毫秒
  ruleId?: string;
}

/**
 * 状态条件
 */
export interface StateCondition {
  chainId: ChainId;
  contractAddress: string;
  stateVariable: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  expectedValue: any;
  tolerance?: number; // 容差值
}

/**
 * 复合条件
 */
export interface CompositeCondition {
  type: 'sequence' | 'frequency' | 'pattern';
  
  // 序列条件
  sequence?: {
    events: EventCondition[];
    timeWindow: number; // 毫秒
    order: 'strict' | 'any';
  };
  
  // 频率条件
  frequency?: {
    event: EventCondition;
    minCount: number;
    maxCount?: number;
    timeWindow: number;
  };
  
  // 模式条件
  pattern?: {
    events: EventCondition[];
    pattern: string; // 正则表达式
    timeWindow: number;
  };
}

/**
 * 自动化动作
 */
export interface AutomationAction {
  id: string;
  type: 'crossChainCall' | 'litAction' | 'contractCall' | 'notification' | 'composite';
  
  // 基础配置
  priority: number; // 1-10
  maxRetries: number;
  timeout: number; // 毫秒
  deadline?: number; // 绝对截止时间
  
  // 特定配置
  config: ActionConfig;
  
  // 执行条件
  preconditions: ActionPrecondition[];
  
  // 后置处理
  postProcessing: PostProcessing[];
}

/**
 * 跨链调用动作配置
 */
export interface CrossChainCallConfig extends ActionConfig {
  sourceChain: ChainId;
  targetChain: ChainId;
  targetContract: string;
  method: string;
  params: any[];
  gasLimit: bigint;
  value?: bigint;
  pkpId: string;
}

/**
 * Lit Action执行配置
 */
export interface LitActionConfig extends ActionConfig {
  actionId?: string; // 预定义的Action ID
  code?: string; // 自定义代码
  params: Record<string, any>;
  authSig: any;
  pkpId: string;
}
```

### 1.4 执行相关数据结构

```typescript
// ju-actions/src/types/execution.ts

/**
 * 执行任务
 */
export interface ExecutionTask {
  id: string;
  action: AutomationAction;
  priority: number;
  createdAt: number;
  deadline: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  status: ExecutionStatus;
}

/**
 * 执行状态
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  task: ExecutionTask;
  workerId: string;
  startTime: number;
  endTime?: number;
  status: ExecutionStatus;
  result?: ExecutionResult;
  error?: Error;
  logs: LogEntry[];
  metrics: ExecutionMetrics;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  receipt?: any;
  result?: any;
  logs?: string[];
  executionTime: number;
  gasUsed?: bigint;
  cost?: bigint;
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  duration: number;
  gasEstimate?: bigint;
  gasUsed?: bigint;
  networkLatency: number;
  executionLatency: number;
}
```

## 2. API接口设计

### 2.1 PKP管理API

```typescript
// ju-actions/src/api/pkp-management.ts

/**
 * PKP管理API接口
 */
export interface PKPManagementAPI {
  
  /**
   * 创建增强版PKP
   */
  createEnhancedPKP(config: PKPCreationConfig): Promise<EnhancedPKP>;
  
  /**
   * 获取PKP信息
   */
  getPKP(pkpId: string): Promise<EnhancedPKP | null>;
  
  /**
   * 更新PKP权限
   */
  updatePermissions(pkpId: string, permissions: Partial<PKPPermissions>): Promise<void>;
  
  /**
   * 更新自动化配置
   */
  updateAutomation(pkpId: string, automation: Partial<AutomationConfig>): Promise<void>;
  
  /**
   * 暂停/恢复PKP
   */
  pausePKP(pkpId: string): Promise<void>;
  resumePKP(pkpId: string): Promise<void>;
  
  /**
   * 撤销PKP
   */
  revokePKP(pkpId: string): Promise<void>;
  
  /**
   * 获取PKP列表
   */
  listPKPs(filter?: PKPFilter): Promise<EnhancedPKP[]>;
  
  /**
   * 获取PKP指标
   */
  getPKPMetrics(pkpId: string, timeRange?: TimeRange): Promise<PKPMetrics>;
}

/**
 * PKP创建配置
 */
export interface PKPCreationConfig {
  permissions: PermissionConfig;
  automation: AutomationConfigInput;
  security: SecurityConfigInput;
  metadata?: PKPMetadataInput;
}

/**
 * PKP过滤器
 */
export interface PKPFilter {
  status?: PKPStatus[];
  chainIds?: ChainId[];
  owner?: string;
  createdAfter?: number;
  createdBefore?: number;
  hasAutomation?: boolean;
}
```

### 2.2 条件规则管理API

```typescript
// ju-actions/src/api/condition-management.ts

/**
 * 条件规则管理API
 */
export interface ConditionManagementAPI {
  
  /**
   * 创建条件规则
   */
  createRule(rule: ConditionRuleInput): Promise<ConditionRule>;
  
  /**
   * 更新条件规则
   */
  updateRule(ruleId: string, updates: Partial<ConditionRuleInput>): Promise<ConditionRule>;
  
  /**
   * 删除条件规则
   */
  deleteRule(ruleId: string): Promise<void>;
  
  /**
   * 获取条件规则
   */
  getRule(ruleId: string): Promise<ConditionRule | null>;
  
  /**
   * 获取规则列表
   */
  listRules(filter?: RuleFilter): Promise<ConditionRule[]>;
  
  /**
   * 启用/禁用规则
   */
  enableRule(ruleId: string): Promise<void>;
  disableRule(ruleId: string): Promise<void>;
  
  /**
   * 测试规则
   */
  testRule(ruleId: string, testEvent: ChainEvent): Promise<RuleTestResult>;
  
  /**
   * 获取规则统计
   */
  getRuleStats(ruleId: string, timeRange?: TimeRange): Promise<RuleStats>;
  
  /**
   * 批量操作
   */
  bulkEnableRules(ruleIds: string[]): Promise<BulkOperationResult>;
  bulkDisableRules(ruleIds: string[]): Promise<BulkOperationResult>;
}

/**
 * 规则过滤器
 */
export interface RuleFilter {
  status?: RuleStatus[];
  pkpId?: string;
  chainId?: ChainId;
  eventType?: string;
  createdAfter?: number;
  createdBefore?: number;
}

/**
 * 规则测试结果
 */
export interface RuleTestResult {
  ruleId: string;
  triggered: boolean;
  matchedConditions: string[];
  failedConditions: string[];
  executionPlan: ExecutionPlan[];
  estimatedCost: bigint;
  riskAssessment: RiskAssessment;
}
```

### 2.3 执行监控API

```typescript
// ju-actions/src/api/execution-monitoring.ts

/**
 * 执行监控API
 */
export interface ExecutionMonitoringAPI {
  
  /**
   * 获取执行历史
   */
  getExecutionHistory(filter?: ExecutionFilter): Promise<ExecutionContext[]>;
  
  /**
   * 获取活跃执行
   */
  getActiveExecutions(): Promise<ExecutionContext[]>;
  
  /**
   * 获取执行详情
   */
  getExecutionDetails(executionId: string): Promise<ExecutionContext | null>;
  
  /**
   * 取消执行
   */
  cancelExecution(executionId: string): Promise<void>;
  
  /**
   * 重试失败的执行
   */
  retryExecution(executionId: string): Promise<string>; // 返回新的executionId
  
  /**
   * 获取执行统计
   */
  getExecutionStats(timeRange?: TimeRange): Promise<ExecutionStats>;
  
  /**
   * 获取系统状态
   */
  getSystemStatus(): Promise<SystemStatus>;
  
  /**
   * 获取性能指标
   */
  getPerformanceMetrics(timeRange?: TimeRange): Promise<PerformanceMetrics>;
}

/**
 * 执行过滤器
 */
export interface ExecutionFilter {
  status?: ExecutionStatus[];
  pkpId?: string;
  ruleId?: string;
  chainId?: ChainId;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

/**
 * 执行统计
 */
export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalGasUsed: bigint;
  totalCost: bigint;
  successRate: number;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  uptime: number;
  version: string;
  activeConnections: number;
  queuedTasks: number;
  processingTasks: number;
  chainStatus: Map<ChainId, ChainStatus>;
  serviceStatus: Map<string, ServiceStatus>;
}

/**
 * 链状态
 */
export interface ChainStatus {
  chainId: ChainId;
  connected: boolean;
  lastBlockNumber: number;
  latency: number;
  errorCount: number;
}
```

### 2.4 跨链操作API

```typescript
// ju-actions/src/api/cross-chain.ts

/**
 * 跨链操作API
 */
export interface CrossChainAPI {
  
  /**
   * 执行跨链调用
   */
  executeCrossChainCall(request: CrossChainCallRequest): Promise<ExecutionResult>;
  
  /**
   * 估算跨链调用成本
   */
  estimateCrossChainCost(request: CrossChainCallRequest): Promise<CostEstimate>;
  
  /**
   * 获取支持的跨链路由
   */
  getSupportedRoutes(): Promise<CrossChainRoute[]>;
  
  /**
   * 验证跨链消息
   */
  validateCrossChainMessage(message: CrossChainMessage): Promise<ValidationResult>;
  
  /**
   * 获取跨链交易状态
   */
  getCrossChainTransactionStatus(txId: string): Promise<CrossChainTransactionStatus>;
  
  /**
   * 获取桥接统计
   */
  getBridgeStats(timeRange?: TimeRange): Promise<BridgeStats>;
}

/**
 * 跨链调用请求
 */
export interface CrossChainCallRequest {
  pkpId: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  targetContract: string;
  method: string;
  params: any[];
  gasLimit?: bigint;
  value?: bigint;
  deadline?: number;
  priority?: number;
}

/**
 * 成本估算
 */
export interface CostEstimate {
  sourceFee: bigint;
  targetFee: bigint;
  bridgeFee: bigint;
  totalCost: bigint;
  estimatedTime: number; // 秒
  confidence: number; // 0-1
}

/**
 * 跨链路由
 */
export interface CrossChainRoute {
  sourceChain: ChainId;
  targetChain: ChainId;
  bridgeContract: string;
  estimatedTime: number;
  baseFee: bigint;
  supported: boolean;
}
```

## 3. 事件系统设计

### 3.1 事件定义

```typescript
// ju-actions/src/types/events.ts

/**
 * 基础链事件
 */
export interface ChainEvent {
  id: string;
  type: 'block' | 'transaction' | 'contract' | 'program';
  chainId: ChainId;
  blockNumber: number;
  blockHash: string;
  transactionHash?: string;
  contractAddress?: string;
  eventSignature?: string;
  args?: any;
  timestamp: number;
  gasUsed?: bigint;
  gasPrice?: bigint;
}

/**
 * 复合事件
 */
export interface CompositeChainEvent extends ChainEvent {
  type: 'composite';
  pattern: CompositeEventPattern;
  triggerEvent: ChainEvent;
  relatedEvents: ChainEvent[];
  patternMatch: PatternMatch;
}

/**
 * 系统事件
 */
export interface SystemEvent {
  id: string;
  type: 'pkp_created' | 'rule_triggered' | 'execution_started' | 'execution_completed' | 'error';
  timestamp: number;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}
```

### 3.2 事件订阅API

```typescript
// ju-actions/src/api/event-subscription.ts

/**
 * 事件订阅API
 */
export interface EventSubscriptionAPI {
  
  /**
   * 订阅链事件
   */
  subscribeChainEvents(subscription: ChainEventSubscription): Promise<string>; // 返回subscriptionId
  
  /**
   * 订阅系统事件
   */
  subscribeSystemEvents(subscription: SystemEventSubscription): Promise<string>;
  
  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): Promise<void>;
  
  /**
   * 获取订阅列表
   */
  getSubscriptions(): Promise<EventSubscription[]>;
  
  /**
   * 暂停/恢复订阅
   */
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
}

/**
 * 链事件订阅
 */
export interface ChainEventSubscription {
  chainIds: ChainId[];
  eventTypes: string[];
  contractAddresses?: string[];
  filters?: EventFilter[];
  callback: EventCallback;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * 事件回调
 */
export type EventCallback = (events: ChainEvent[]) => Promise<void>;
```

## 4. 安全规范

### 4.1 身份验证和授权

```typescript
// ju-actions/src/types/auth.ts

/**
 * 身份验证配置
 */
export interface AuthConfig {
  method: 'jwt' | 'signature' | 'oauth' | 'api_key';
  options: AuthOptions;
}

/**
 * 授权上下文
 */
export interface AuthContext {
  userId: string;
  userType: 'admin' | 'developer' | 'user';
  permissions: Permission[];
  sessionId: string;
  expiresAt: number;
}

/**
 * 权限定义
 */
export interface Permission {
  resource: string; // e.g., 'pkp', 'rule', 'execution'
  actions: string[]; // e.g., ['read', 'write', 'delete']
  conditions?: PermissionCondition[];
}

/**
 * 签名验证
 */
export interface SignatureAuth {
  message: string;
  signature: string;
  publicKey: string;
  algorithm: 'ecdsa' | 'eddsa';
}
```

### 4.2 风险管理

```typescript
// ju-actions/src/types/risk.ts

/**
 * 风险评估
 */
export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  approved: boolean;
  approver?: string;
}

/**
 * 风险等级
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 风险因子
 */
export interface RiskFactor {
  type: 'value' | 'frequency' | 'contract' | 'user' | 'time';
  description: string;
  impact: number; // 0-100
  weight: number; // 0-1
}
```

## 5. 错误处理规范

### 5.1 错误定义

```typescript
// ju-actions/src/types/errors.ts

/**
 * 标准错误接口
 */
export interface StandardError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId?: string;
  stackTrace?: string;
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 认证错误
  AUTH_INVALID_TOKEN = 'AUTH_001',
  AUTH_EXPIRED_TOKEN = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  
  // PKP错误
  PKP_NOT_FOUND = 'PKP_001',
  PKP_PERMISSION_DENIED = 'PKP_002',
  PKP_SIGNING_FAILED = 'PKP_003',
  
  // 规则错误
  RULE_INVALID_CONDITION = 'RULE_001',
  RULE_EXECUTION_FAILED = 'RULE_002',
  RULE_COOLDOWN_ACTIVE = 'RULE_003',
  
  // 执行错误
  EXEC_TIMEOUT = 'EXEC_001',
  EXEC_GAS_LIMIT_EXCEEDED = 'EXEC_002',
  EXEC_INSUFFICIENT_BALANCE = 'EXEC_003',
  
  // 网络错误
  NETWORK_CONNECTION_FAILED = 'NET_001',
  NETWORK_RPC_ERROR = 'NET_002',
  NETWORK_TIMEOUT = 'NET_003',
  
  // 系统错误
  SYSTEM_INTERNAL_ERROR = 'SYS_001',
  SYSTEM_MAINTENANCE = 'SYS_002',
  SYSTEM_OVERLOADED = 'SYS_003'
}
```

### 5.2 错误处理策略

```typescript
// ju-actions/src/utils/error-handler.ts

/**
 * 错误处理策略
 */
export interface ErrorHandlingStrategy {
  retryable: boolean;
  maxRetries: number;
  retryDelay: number; // 毫秒
  backoffMultiplier: number;
  escalate: boolean;
  notification: boolean;
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  
  /**
   * 处理错误
   */
  static async handleError(
    error: Error,
    context: ErrorContext,
    strategy?: ErrorHandlingStrategy
  ): Promise<ErrorHandlingResult>;
  
  /**
   * 判断是否可重试
   */
  static isRetryable(error: Error): boolean;
  
  /**
   * 生成错误报告
   */
  static generateErrorReport(error: Error, context: ErrorContext): ErrorReport;
}
```

## 6. 配置管理

### 6.1 配置结构

```typescript
// ju-actions/src/types/config.ts

/**
 * 系统配置
 */
export interface SystemConfig {
  // 网络配置
  networks: Map<ChainId, ChainConfig>;
  
  // Lit Protocol配置
  litProtocol: LitProtocolConfig;
  
  // 数据库配置
  database: DatabaseConfig;
  
  // 缓存配置
  cache: CacheConfig;
  
  // 监控配置
  monitoring: MonitoringConfig;
  
  // 安全配置
  security: SecurityConfig;
  
  // 性能配置
  performance: PerformanceConfig;
}

/**
 * Lit Protocol配置
 */
export interface LitProtocolConfig {
  networkName: string;
  rpcUrl: string;
  contractAddresses: {
    pkpNft: string;
    pkpPermissions: string;
    pkpHelper: string;
  };
  authMethods: AuthMethodConfig[];
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  maxConcurrentExecutions: number;
  executionTimeout: number;
  queueSize: number;
  workerCount: number;
  batchSize: number;
  cacheSize: number;
}
```

## 7. 监控和日志规范

### 7.1 日志格式

```typescript
// ju-actions/src/types/logging.ts

/**
 * 标准日志条目
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  service: string;
  component: string;
  message: string;
  data?: any;
  requestId?: string;
  userId?: string;
  pkpId?: string;
  executionId?: string;
  chainId?: ChainId;
  tags?: string[];
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}
```

### 7.2 监控指标

```typescript
// ju-actions/src/types/metrics.ts

/**
 * 系统指标
 */
export interface SystemMetrics {
  // 基础指标
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  
  // 业务指标
  activeConnections: number;
  queuedTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  
  // 性能指标
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  
  // 自定义指标
  customMetrics: Map<string, number>;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  // 执行性能
  executionMetrics: {
    averageTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p95: number;
    p99: number;
  };
  
  // 网络性能
  networkMetrics: Map<ChainId, NetworkMetrics>;
  
  // 资源使用
  resourceUsage: {
    gasUsed: bigint;
    transactionCount: number;
    storageUsed: number;
  };
}
```

## 8. 集成规范

### 8.1 SDK设计

```typescript
// ju-actions/src/sdk/index.ts

/**
 * JU Cross-Chain SDK
 */
export class JUCrossChainSDK {
  
  constructor(config: SDKConfig);
  
  // PKP管理
  pkp: PKPManagementAPI;
  
  // 条件规则管理
  rules: ConditionManagementAPI;
  
  // 执行监控
  monitoring: ExecutionMonitoringAPI;
  
  // 跨链操作
  crossChain: CrossChainAPI;
  
  // 事件订阅
  events: EventSubscriptionAPI;
  
  // 工具方法
  utils: UtilityAPI;
}

/**
 * SDK配置
 */
export interface SDKConfig {
  apiKey: string;
  baseUrl: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  timeout: number;
  retries: number;
  debug: boolean;
}
```

### 8.2 Webhook规范

```typescript
// ju-actions/src/types/webhook.ts

/**
 * Webhook配置
 */
export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryConfig: WebhookRetryConfig;
}

/**
 * Webhook负载
 */
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: number;
  data: any;
  signature: string;
}

/**
 * Webhook重试配置
 */
export interface WebhookRetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
```

## 9. 测试规范

### 9.1 测试数据结构

```typescript
// ju-actions/src/types/testing.ts

/**
 * 测试配置
 */
export interface TestConfig {
  environment: 'unit' | 'integration' | 'e2e';
  mockData: MockDataConfig;
  testChains: ChainId[];
  testAccounts: TestAccount[];
}

/**
 * 测试账户
 */
export interface TestAccount {
  chainId: ChainId;
  address: string;
  privateKey: string;
  balance: bigint;
  role: 'admin' | 'user' | 'operator';
}

/**
 * 模拟数据配置
 */
export interface MockDataConfig {
  events: MockChainEvent[];
  pkps: MockPKP[];
  rules: MockConditionRule[];
}
```

## 总结

这个技术规范文档定义了完整的API接口、数据结构和集成标准，为实现基于Lit Protocol MPC网络的跨链自动化系统提供了详细的技术指导。通过遵循这些规范，可以确保系统的一致性、可维护性和可扩展性。