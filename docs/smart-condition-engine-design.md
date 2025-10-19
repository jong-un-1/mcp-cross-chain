# Smart Condition Engine Design
# 智能条件执行引擎设计方案

## 概述

设计一个智能条件执行引擎，支持链上事件监听和自动触发跨链合约调用。基于现有的 `ju-services/src/services/keeper/keeper-service.ts` 架构，扩展支持复杂的条件逻辑和自动化执行。

## 现有基础分析

### 当前Keeper服务能力
```typescript
// 现有文件: ju-services/src/services/keeper/keeper-service.ts
// 支持功能:
// - 定时任务调度
// - 基础订单监控
// - 简单的Lit Action触发
// - 流动性重平衡检查
```

### 需要增强的功能
1. **实时事件监听** - 多链事件的实时捕获和处理
2. **复杂条件引擎** - 支持逻辑组合和时间条件
3. **智能决策系统** - 基于AI的执行决策
4. **跨链协调器** - 统一的跨链操作编排

## 条件执行引擎架构

### 1. 核心引擎设计

```typescript
// 新文件: ju-actions/src/engines/smart-condition-engine.ts

export class SmartConditionEngine {
  private eventMonitor: MultiChainEventMonitor;
  private conditionEvaluator: ConditionEvaluator;
  private executionOrchestrator: ExecutionOrchestrator;
  private riskManager: RiskManager;
  
  constructor(config: ConditionEngineConfig) {
    this.eventMonitor = new MultiChainEventMonitor(config.chains);
    this.conditionEvaluator = new ConditionEvaluator(config.rules);
    this.executionOrchestrator = new ExecutionOrchestrator(config.pkps);
    this.riskManager = new RiskManager(config.security);
  }
  
  /**
   * 启动条件执行引擎
   */
  async start(): Promise<void> {
    // 启动事件监听
    await this.eventMonitor.start();
    
    // 注册事件处理器
    this.eventMonitor.on('chainEvent', this.handleChainEvent.bind(this));
    this.eventMonitor.on('blockEvent', this.handleBlockEvent.bind(this));
    this.eventMonitor.on('transactionEvent', this.handleTransactionEvent.bind(this));
    
    console.log('Smart Condition Engine started');
  }
  
  /**
   * 处理链上事件
   */
  private async handleChainEvent(event: ChainEvent): Promise<void> {
    try {
      // 1. 事件预处理和验证
      const processedEvent = await this.preprocessEvent(event);
      
      // 2. 条件评估
      const evaluationResult = await this.conditionEvaluator.evaluate(processedEvent);
      
      // 3. 如果条件满足，生成执行决策
      if (evaluationResult.shouldExecute) {
        const decisions = await this.generateExecutionDecisions(
          processedEvent, 
          evaluationResult
        );
        
        // 4. 风险评估
        const riskAssessments = await Promise.all(
          decisions.map(decision => this.riskManager.assess(decision))
        );
        
        // 5. 执行自动化操作
        for (let i = 0; i < decisions.length; i++) {
          const decision = decisions[i];
          const risk = riskAssessments[i];
          
          if (risk.level <= RiskLevel.MEDIUM) {
            await this.executeDecision(decision);
          } else {
            await this.escalateHighRiskDecision(decision, risk);
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling chain event:', error);
      await this.handleError(event, error);
    }
  }
  
  /**
   * 生成执行决策
   */
  private async generateExecutionDecisions(
    event: ChainEvent,
    evaluation: ConditionEvaluationResult
  ): Promise<ExecutionDecision[]> {
    
    const decisions: ExecutionDecision[] = [];
    
    for (const rule of evaluation.triggeredRules) {
      for (const action of rule.actions) {
        const decision: ExecutionDecision = {
          id: generateId(),
          timestamp: Date.now(),
          sourceEvent: event,
          triggeredRule: rule,
          action: action,
          priority: this.calculatePriority(event, rule, action),
          estimatedCost: await this.estimateExecutionCost(action),
          deadline: Date.now() + (rule.deadline || 300000) // 5分钟默认
        };
        
        decisions.push(decision);
      }
    }
    
    // 按优先级排序
    return decisions.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 执行决策
   */
  private async executeDecision(decision: ExecutionDecision): Promise<void> {
    const execution: ExecutionContext = {
      decision,
      startTime: Date.now(),
      status: ExecutionStatus.PENDING,
      attempts: 0,
      maxAttempts: 3
    };
    
    try {
      // 记录执行开始
      await this.recordExecutionStart(execution);
      
      // 执行操作
      const result = await this.executionOrchestrator.execute(decision.action);
      
      // 更新执行状态
      execution.status = ExecutionStatus.COMPLETED;
      execution.result = result;
      execution.endTime = Date.now();
      
      await this.recordExecutionComplete(execution);
      
    } catch (error) {
      execution.attempts++;
      execution.error = error;
      
      if (execution.attempts < execution.maxAttempts) {
        // 重试逻辑
        await this.scheduleRetry(execution);
      } else {
        execution.status = ExecutionStatus.FAILED;
        await this.recordExecutionFailed(execution);
      }
    }
  }
}
```

### 2. 多链事件监听器

```typescript
// 新文件: ju-actions/src/services/multi-chain-event-monitor.ts

export class MultiChainEventMonitor extends EventEmitter {
  private chainMonitors: Map<ChainId, ChainMonitor>;
  private eventBuffer: CircularBuffer<ChainEvent>;
  private filterEngine: EventFilterEngine;
  
  constructor(chainConfigs: ChainConfig[]) {
    super();
    this.chainMonitors = new Map();
    this.eventBuffer = new CircularBuffer<ChainEvent>(10000);
    this.filterEngine = new EventFilterEngine();
    
    // 初始化每个链的监听器
    this.initializeChainMonitors(chainConfigs);
  }
  
  /**
   * 初始化链监听器
   */
  private initializeChainMonitors(configs: ChainConfig[]): void {
    for (const config of configs) {
      let monitor: ChainMonitor;
      
      if (config.chainId === ChainId.SOLANA) {
        monitor = new SolanaChainMonitor(config);
      } else {
        monitor = new EVMChainMonitor(config);
      }
      
      // 注册事件处理器
      monitor.on('event', this.handleRawEvent.bind(this));
      monitor.on('error', this.handleMonitorError.bind(this));
      
      this.chainMonitors.set(config.chainId, monitor);
    }
  }
  
  /**
   * 启动所有链监听器
   */
  async start(): Promise<void> {
    const startPromises = Array.from(this.chainMonitors.values())
      .map(monitor => monitor.start());
    
    await Promise.all(startPromises);
    console.log(`Started monitoring ${this.chainMonitors.size} chains`);
  }
  
  /**
   * 处理原始事件
   */
  private async handleRawEvent(rawEvent: RawChainEvent): Promise<void> {
    try {
      // 1. 标准化事件格式
      const standardEvent = await this.standardizeEvent(rawEvent);
      
      // 2. 应用过滤器
      const shouldProcess = await this.filterEngine.shouldProcess(standardEvent);
      
      if (shouldProcess) {
        // 3. 缓存事件
        this.eventBuffer.add(standardEvent);
        
        // 4. 发出处理事件
        this.emit('chainEvent', standardEvent);
        
        // 5. 检查复合事件
        await this.checkCompositeEvents(standardEvent);
      }
      
    } catch (error) {
      console.error('Error processing raw event:', error);
    }
  }
  
  /**
   * 检查复合事件 (多个事件组合触发)
   */
  private async checkCompositeEvents(event: ChainEvent): Promise<void> {
    const recentEvents = this.eventBuffer.getRecent(100);
    
    // 检查时间窗口内的事件组合
    const timeWindow = 60000; // 1分钟
    const relevantEvents = recentEvents.filter(e => 
      Date.now() - e.timestamp < timeWindow
    );
    
    // 查找匹配的复合事件模式
    const compositePatterns = await this.getCompositeEventPatterns();
    
    for (const pattern of compositePatterns) {
      const match = await this.matchCompositePattern(pattern, relevantEvents);
      
      if (match) {
        const compositeEvent: CompositeChainEvent = {
          id: generateId(),
          type: 'composite',
          pattern: pattern,
          triggerEvent: event,
          relatedEvents: match.events,
          timestamp: Date.now(),
          chainId: event.chainId
        };
        
        this.emit('compositeEvent', compositeEvent);
      }
    }
  }
}

/**
 * EVM链监听器
 */
export class EVMChainMonitor extends EventEmitter {
  private provider: ethers.providers.Provider;
  private contracts: Map<string, ethers.Contract>;
  private lastProcessedBlock: number;
  
  constructor(private config: EVMChainConfig) {
    super();
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.contracts = new Map();
    this.lastProcessedBlock = 0;
    
    this.initializeContracts();
  }
  
  /**
   * 启动EVM监听
   */
  async start(): Promise<void> {
    // 获取当前区块高度
    this.lastProcessedBlock = await this.provider.getBlockNumber();
    
    // 监听新区块
    this.provider.on('block', this.handleNewBlock.bind(this));
    
    // 设置定期检查机制 (防止websocket断开)
    setInterval(() => {
      this.checkMissedBlocks();
    }, 30000); // 30秒检查一次
    
    console.log(`EVM monitor started for chain ${this.config.chainId}`);
  }
  
  /**
   * 处理新区块
   */
  private async handleNewBlock(blockNumber: number): Promise<void> {
    try {
      if (blockNumber <= this.lastProcessedBlock) return;
      
      // 处理可能错过的区块
      for (let i = this.lastProcessedBlock + 1; i <= blockNumber; i++) {
        await this.processBlock(i);
      }
      
      this.lastProcessedBlock = blockNumber;
      
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }
  
  /**
   * 处理单个区块
   */
  private async processBlock(blockNumber: number): Promise<void> {
    const block = await this.provider.getBlockWithTransactions(blockNumber);
    
    // 发出区块事件
    this.emit('event', {
      type: 'block',
      chainId: this.config.chainId,
      blockNumber,
      blockHash: block.hash,
      timestamp: block.timestamp * 1000,
      transactionCount: block.transactions.length
    });
    
    // 处理区块中的交易
    for (const tx of block.transactions) {
      await this.processTransaction(tx, blockNumber);
    }
  }
  
  /**
   * 处理交易
   */
  private async processTransaction(
    tx: ethers.providers.TransactionResponse,
    blockNumber: number
  ): Promise<void> {
    
    // 检查是否是我们关心的合约交易
    if (!tx.to || !this.contracts.has(tx.to)) return;
    
    try {
      // 获取交易收据
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      
      // 解析日志
      const contract = this.contracts.get(tx.to);
      if (contract && receipt.logs.length > 0) {
        
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            
            // 发出合约事件
            this.emit('event', {
              type: 'contract',
              chainId: this.config.chainId,
              blockNumber,
              transactionHash: tx.hash,
              contractAddress: log.address,
              eventName: parsed.name,
              eventSignature: parsed.signature,
              args: parsed.args,
              timestamp: Date.now()
            });
            
          } catch (parseError) {
            // 忽略无法解析的日志
          }
        }
      }
      
    } catch (error) {
      console.error(`Error processing transaction ${tx.hash}:`, error);
    }
  }
}

/**
 * Solana链监听器
 */
export class SolanaChainMonitor extends EventEmitter {
  private connection: Connection;
  private programMonitors: Map<string, number>;
  
  constructor(private config: SolanaChainConfig) {
    super();
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programMonitors = new Map();
  }
  
  /**
   * 启动Solana监听
   */
  async start(): Promise<void> {
    // 监听程序账户变化
    for (const programId of this.config.programIds) {
      this.startProgramMonitoring(programId);
    }
    
    // 监听区块变化
    this.connection.onSlotChange(this.handleSlotChange.bind(this));
    
    console.log(`Solana monitor started for ${this.config.programIds.length} programs`);
  }
  
  /**
   * 启动程序监听
   */
  private async startProgramMonitoring(programId: string): Promise<void> {
    const pubkey = new PublicKey(programId);
    
    // 监听程序日志
    const subscriptionId = this.connection.onLogs(
      pubkey,
      this.handleProgramLogs.bind(this),
      'confirmed'
    );
    
    this.programMonitors.set(programId, subscriptionId);
  }
  
  /**
   * 处理程序日志
   */
  private async handleProgramLogs(
    logs: Logs,
    context: Context
  ): Promise<void> {
    
    try {
      // 解析交易获取详细信息
      const tx = await this.connection.getTransaction(
        logs.signature,
        { commitment: 'confirmed' }
      );
      
      if (!tx) return;
      
      // 分析指令调用
      for (const instruction of tx.transaction.message.instructions) {
        const programId = tx.transaction.message.accountKeys[instruction.programIdIndex];
        
        if (this.config.programIds.includes(programId.toString())) {
          
          // 解析指令数据
          const instructionData = await this.parseInstructionData(
            instruction.data,
            programId.toString()
          );
          
          // 发出程序事件
          this.emit('event', {
            type: 'program',
            chainId: ChainId.SOLANA,
            slot: context.slot,
            signature: logs.signature,
            programId: programId.toString(),
            instruction: instructionData,
            logs: logs.logs,
            timestamp: Date.now()
          });
        }
      }
      
    } catch (error) {
      console.error(`Error processing Solana logs:`, error);
    }
  }
}
```

### 3. 条件评估引擎

```typescript
// 新文件: ju-actions/src/engines/condition-evaluator.ts

export class ConditionEvaluator {
  private ruleEngine: RuleEngine;
  private contextProvider: ContextProvider;
  private aiAssistant: AIAssistant;
  
  constructor(private config: ConditionEvaluatorConfig) {
    this.ruleEngine = new RuleEngine(config.rules);
    this.contextProvider = new ContextProvider(config.context);
    this.aiAssistant = new AIAssistant(config.ai);
  }
  
  /**
   * 评估事件是否触发执行条件
   */
  async evaluate(event: ChainEvent): Promise<ConditionEvaluationResult> {
    
    // 1. 获取相关上下文
    const context = await this.contextProvider.getContext(event);
    
    // 2. 基础规则匹配
    const basicMatches = await this.ruleEngine.findMatches(event, context);
    
    // 3. 复杂条件评估
    const evaluatedRules: EvaluatedRule[] = [];
    
    for (const match of basicMatches) {
      const evaluation = await this.evaluateRule(match.rule, event, context);
      
      if (evaluation.satisfied) {
        evaluatedRules.push({
          rule: match.rule,
          evaluation,
          confidence: evaluation.confidence,
          actions: await this.generateActions(match.rule, event, context)
        });
      }
    }
    
    // 4. AI辅助决策 (可选)
    if (this.config.enableAI && evaluatedRules.length > 0) {
      const aiAnalysis = await this.aiAssistant.analyzeConditions(
        event,
        evaluatedRules,
        context
      );
      
      // 根据AI分析调整规则权重
      this.adjustRuleWeights(evaluatedRules, aiAnalysis);
    }
    
    // 5. 生成最终结果
    return {
      shouldExecute: evaluatedRules.length > 0,
      triggeredRules: evaluatedRules.filter(r => r.confidence > 0.7),
      allMatches: evaluatedRules,
      context,
      timestamp: Date.now()
    };
  }
  
  /**
   * 评估单个规则
   */
  private async evaluateRule(
    rule: ConditionRule,
    event: ChainEvent,
    context: ExecutionContext
  ): Promise<RuleEvaluation> {
    
    const evaluation: RuleEvaluation = {
      satisfied: false,
      confidence: 0,
      details: [],
      metadata: {}
    };
    
    // 1. 事件匹配检查
    const eventMatch = await this.checkEventMatch(rule.eventCriteria, event);
    if (!eventMatch.matches) {
      evaluation.details.push('Event criteria not met');
      return evaluation;
    }
    evaluation.confidence += 0.3;
    
    // 2. 时间条件检查
    const timeMatch = await this.checkTimeConditions(rule.timeConditions, event);
    if (!timeMatch.satisfied) {
      evaluation.details.push('Time conditions not met');
      return evaluation;
    }
    evaluation.confidence += 0.2;
    
    // 3. 状态条件检查
    const stateMatch = await this.checkStateConditions(
      rule.stateConditions,
      event,
      context
    );
    if (!stateMatch.satisfied) {
      evaluation.details.push('State conditions not met');
      return evaluation;
    }
    evaluation.confidence += 0.3;
    
    // 4. 复合条件检查
    if (rule.compositeConditions) {
      const compositeMatch = await this.checkCompositeConditions(
        rule.compositeConditions,
        event,
        context
      );
      
      if (!compositeMatch.satisfied) {
        evaluation.details.push('Composite conditions not met');
        return evaluation;
      }
      evaluation.confidence += 0.2;
    }
    
    evaluation.satisfied = true;
    evaluation.details.push('All conditions satisfied');
    
    return evaluation;
  }
  
  /**
   * 检查事件匹配条件
   */
  private async checkEventMatch(
    criteria: EventCriteria,
    event: ChainEvent
  ): Promise<MatchResult> {
    
    // 检查事件类型
    if (criteria.eventType && criteria.eventType !== event.type) {
      return { matches: false, reason: 'Event type mismatch' };
    }
    
    // 检查链ID
    if (criteria.chainId && criteria.chainId !== event.chainId) {
      return { matches: false, reason: 'Chain ID mismatch' };
    }
    
    // 检查合约地址
    if (criteria.contractAddress && 
        criteria.contractAddress !== event.contractAddress) {
      return { matches: false, reason: 'Contract address mismatch' };
    }
    
    // 检查事件签名
    if (criteria.eventSignature && 
        criteria.eventSignature !== event.eventSignature) {
      return { matches: false, reason: 'Event signature mismatch' };
    }
    
    // 检查参数条件
    if (criteria.parameterConditions) {
      for (const paramCondition of criteria.parameterConditions) {
        const paramMatch = await this.checkParameterCondition(
          paramCondition,
          event.args
        );
        
        if (!paramMatch.matches) {
          return { matches: false, reason: `Parameter condition failed: ${paramMatch.reason}` };
        }
      }
    }
    
    return { matches: true };
  }
  
  /**
   * 检查时间条件
   */
  private async checkTimeConditions(
    conditions: TimeCondition[],
    event: ChainEvent
  ): Promise<ConditionResult> {
    
    if (!conditions || conditions.length === 0) {
      return { satisfied: true };
    }
    
    for (const condition of conditions) {
      const satisfied = await this.evaluateTimeCondition(condition, event);
      
      if (!satisfied) {
        return { 
          satisfied: false, 
          reason: `Time condition not met: ${condition.type}` 
        };
      }
    }
    
    return { satisfied: true };
  }
  
  /**
   * 评估时间条件
   */
  private async evaluateTimeCondition(
    condition: TimeCondition,
    event: ChainEvent
  ): Promise<boolean> {
    
    const now = Date.now();
    const eventTime = event.timestamp;
    
    switch (condition.type) {
      case 'after':
        return eventTime >= condition.timestamp;
        
      case 'before':
        return eventTime <= condition.timestamp;
        
      case 'between':
        return eventTime >= condition.startTime && 
               eventTime <= condition.endTime;
        
      case 'dayOfWeek':
        const dayOfWeek = new Date(eventTime).getDay();
        return condition.daysOfWeek.includes(dayOfWeek);
        
      case 'timeOfDay':
        const hour = new Date(eventTime).getHours();
        return hour >= condition.startHour && hour <= condition.endHour;
        
      case 'cooldown':
        const lastExecution = await this.getLastExecutionTime(condition.ruleId);
        return !lastExecution || 
               (now - lastExecution) >= condition.cooldownPeriod;
        
      default:
        return true;
    }
  }
}
```

### 4. 执行编排器

```typescript
// 新文件: ju-actions/src/orchestrators/execution-orchestrator.ts

export class ExecutionOrchestrator {
  private pkpManager: PKPManager;
  private crossChainBridge: CrossChainBridge;
  private executionQueue: PriorityQueue<ExecutionTask>;
  private activeExecutions: Map<string, ExecutionContext>;
  
  constructor(private config: OrchestratorConfig) {
    this.pkpManager = new PKPManager(config.pkps);
    this.crossChainBridge = new CrossChainBridge(config.bridges);
    this.executionQueue = new PriorityQueue<ExecutionTask>();
    this.activeExecutions = new Map();
    
    // 启动执行worker
    this.startExecutionWorkers();
  }
  
  /**
   * 执行自动化操作
   */
  async execute(action: AutomationAction): Promise<ExecutionResult> {
    
    // 1. 创建执行任务
    const task: ExecutionTask = {
      id: generateId(),
      action,
      priority: action.priority || 5,
      createdAt: Date.now(),
      deadline: action.deadline || (Date.now() + 300000), // 5分钟
      retryCount: 0,
      maxRetries: action.maxRetries || 3
    };
    
    // 2. 验证执行前提条件
    const precheck = await this.precheckExecution(task);
    if (!precheck.valid) {
      throw new Error(`Precheck failed: ${precheck.errors.join(', ')}`);
    }
    
    // 3. 加入执行队列
    this.executionQueue.enqueue(task);
    
    // 4. 等待执行完成
    return await this.waitForExecution(task.id);
  }
  
  /**
   * 启动执行worker
   */
  private startExecutionWorkers(): void {
    const workerCount = this.config.workerCount || 3;
    
    for (let i = 0; i < workerCount; i++) {
      this.startExecutionWorker(`worker-${i}`);
    }
  }
  
  /**
   * 执行worker逻辑
   */
  private async startExecutionWorker(workerId: string): Promise<void> {
    while (true) {
      try {
        // 从队列获取任务
        const task = await this.executionQueue.dequeue();
        
        if (task) {
          await this.executeTask(task, workerId);
        } else {
          // 没有任务时休眠
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Execution worker ${workerId} error:`, error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 错误后等待5秒
      }
    }
  }
  
  /**
   * 执行单个任务
   */
  private async executeTask(task: ExecutionTask, workerId: string): Promise<void> {
    const context: ExecutionContext = {
      task,
      workerId,
      startTime: Date.now(),
      status: ExecutionStatus.RUNNING
    };
    
    this.activeExecutions.set(task.id, context);
    
    try {
      // 根据动作类型选择执行方式
      let result: ExecutionResult;
      
      switch (task.action.type) {
        case 'crossChainCall':
          result = await this.executeCrossChainCall(task.action, context);
          break;
          
        case 'litAction':
          result = await this.executeLitAction(task.action, context);
          break;
          
        case 'contractCall':
          result = await this.executeContractCall(task.action, context);
          break;
          
        case 'composite':
          result = await this.executeCompositeAction(task.action, context);
          break;
          
        default:
          throw new Error(`Unknown action type: ${task.action.type}`);
      }
      
      // 更新执行状态
      context.status = ExecutionStatus.COMPLETED;
      context.result = result;
      context.endTime = Date.now();
      
    } catch (error) {
      context.status = ExecutionStatus.FAILED;
      context.error = error;
      context.endTime = Date.now();
      
      // 重试逻辑
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.nextRetryAt = Date.now() + (1000 * Math.pow(2, task.retryCount)); // 指数退避
        
        this.executionQueue.enqueue(task);
        context.status = ExecutionStatus.RETRYING;
      }
    } finally {
      this.activeExecutions.set(task.id, context);
    }
  }
  
  /**
   * 执行跨链调用
   */
  private async executeCrossChainCall(
    action: CrossChainCallAction,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    
    // 1. 获取PKP
    const pkp = await this.pkpManager.getPKP(action.pkpId);
    if (!pkp) {
      throw new Error(`PKP not found: ${action.pkpId}`);
    }
    
    // 2. 验证权限
    const authorized = await this.pkpManager.checkAuthorization(
      pkp,
      action.sourceChain,
      action.targetChain,
      action.targetContract,
      action.method
    );
    
    if (!authorized) {
      throw new Error('PKP not authorized for this operation');
    }
    
    // 3. 准备跨链消息
    const message: CrossChainMessage = {
      id: generateId(),
      sourceChain: action.sourceChain,
      targetChain: action.targetChain,
      targetContract: action.targetContract,
      method: action.method,
      params: action.params,
      gasLimit: action.gasLimit,
      deadline: action.deadline,
      nonce: await this.generateNonce(pkp.pkpId),
      signature: '' // 将由PKP签名
    };
    
    // 4. PKP签名
    const signature = await this.pkpManager.signMessage(pkp, message);
    message.signature = signature;
    
    // 5. 执行跨链调用
    const txHash = await this.crossChainBridge.send(message);
    
    // 6. 等待确认
    const receipt = await this.crossChainBridge.waitForConfirmation(
      txHash,
      action.targetChain
    );
    
    return {
      success: receipt.status === 1,
      transactionHash: txHash,
      receipt,
      executionTime: Date.now() - context.startTime
    };
  }
  
  /**
   * 执行Lit Action
   */
  private async executeLitAction(
    action: LitActionExecutionAction,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    
    // 基于现有solver-lit-impl.ts的逻辑
    const litActionCode = action.code || await this.getLitActionCode(action.actionId);
    
    const result = await LitActions.runOnce({
      code: litActionCode,
      authSig: action.authSig,
      jsParams: action.params
    });
    
    return {
      success: true,
      result: result.response,
      logs: result.logs,
      executionTime: Date.now() - context.startTime
    };
  }
}
```

## 集成方案

### 与现有系统集成

#### 1. 扩展Keeper Service
```typescript
// 在现有keeper-service.ts中集成智能条件引擎
import { SmartConditionEngine } from '../engines/smart-condition-engine';

export class EnhancedKeeperService extends KeeperService {
  private conditionEngine: SmartConditionEngine;
  
  async onInitialize(): Promise<void> {
    await super.onInitialize();
    
    // 初始化智能条件引擎
    this.conditionEngine = new SmartConditionEngine({
      chains: this.getSupportedChains(),
      rules: await this.loadConditionRules(),
      pkps: await this.loadPKPConfigurations(),
      security: this.getSecurityConfig()
    });
    
    await this.conditionEngine.start();
  }
  
  // 保持现有API兼容性，添加增强功能
  async processAutomaticExecution(trigger: ExecutionTrigger): Promise<void> {
    // 使用智能条件引擎处理
    await this.conditionEngine.handleTrigger(trigger);
  }
}
```

## 部署和测试计划

### Phase 1: 基础事件监听 (1周)
1. 实现MultiChainEventMonitor基础框架
2. 实现EVM和Solana事件监听器
3. 基础事件过滤和缓存
4. 单元测试

### Phase 2: 条件评估引擎 (1.5周)
1. 实现ConditionEvaluator核心逻辑
2. 支持基础条件类型 (时间、状态、参数)
3. 实现规则匹配引擎
4. 集成测试

### Phase 3: 执行编排器 (1.5周)
1. 实现ExecutionOrchestrator
2. 支持多种执行类型
3. 实现重试和错误处理
4. 性能优化

### Phase 4: 系统集成 (1周)
1. 集成到现有Keeper服务
2. 端到端测试
3. 性能压力测试
4. 文档和部署

通过这个智能条件执行引擎，系统将能够实时监听多链事件，智能评估复杂条件，并自动执行跨链合约调用，真正实现自动化的跨链操作。