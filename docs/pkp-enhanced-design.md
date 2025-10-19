# PKP Enhanced Design Specification
# 可编程密钥对(PKPs)增强设计方案

## 概述

基于现有的 `ju-actions/src/actions/auth/create-sol-orchestrator-lit.ts` 实现，设计增强版PKP系统，支持多链自动化合约调用和门限签名机制。

## 现有基础分析

### 当前PKP实现
```typescript
// 现有文件: ju-actions/src/actions/auth/create-sol-orchestrator-lit.ts
// 支持功能:
// - 基础PKP创建
// - Solana地址生成
// - 基础权限管理
```

### 需要增强的功能
1. **多链支持** - 从单一Solana扩展到多EVM链
2. **自动化权限** - 支持条件触发的自动签名
3. **跨链协调** - 统一的跨链操作接口
4. **安全增强** - 更细粒度的权限控制

## 增强架构设计

### 1. 多链PKP数据结构

```typescript
// 新文件: ju-actions/src/types/enhanced-pkp.ts

export interface EnhancedPKP {
  // 基础PKP信息
  pkpId: string;
  publicKey: string;
  pkpNFTId?: string;
  
  // 多链地址映射
  chainAddresses: Map<ChainId, string>;
  
  // 权限和配置
  permissions: PKPPermissions;
  automation: AutomationConfig;
  security: SecurityConfig;
  
  // 状态信息
  status: PKPStatus;
  metrics: PKPMetrics;
}

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
}

export interface AutomationConfig {
  enabled: boolean;
  triggers: TriggerConfig[];
  executionRules: ExecutionRule[];
  cooldownPeriods: Map<string, number>;
}

export interface SecurityConfig {
  // 门限签名设置
  thresholdSignature: {
    requiredSignatures: number;
    totalNodes: number;
    timeout: number;
  };
  
  // 访问控制
  accessControl: {
    allowlist: string[];
    requireMFA: boolean;
    sessionTimeout: number;
  };
  
  // 风险控制
  riskControl: {
    maxTransactionValue: bigint;
    suspiciousActivityDetection: boolean;
    emergencyPause: boolean;
  };
}
```

### 2. 多链地址管理器

```typescript
// 新文件: ju-actions/src/services/multi-chain-address-manager.ts

export class MultiChainAddressManager {
  private pkp: EnhancedPKP;
  
  constructor(pkp: EnhancedPKP) {
    this.pkp = pkp;
  }
  
  /**
   * 从PKP公钥派生多链地址
   */
  async deriveChainAddresses(): Promise<Map<ChainId, string>> {
    const addresses = new Map<ChainId, string>();
    
    // EVM链地址派生 (所有EVM链共享同一地址)
    const evmAddress = await this.deriveEVMAddress(this.pkp.publicKey);
    
    // 为所有支持的EVM链添加相同地址
    const evmChains = [
      ChainId.ETHEREUM,
      ChainId.BSC, 
      ChainId.POLYGON,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM
    ];
    
    evmChains.forEach(chainId => {
      addresses.set(chainId, evmAddress);
    });
    
    // Solana地址派生
    const solanaAddress = await this.deriveSolanaAddress(this.pkp.publicKey);
    addresses.set(ChainId.SOLANA, solanaAddress);
    
    return addresses;
  }
  
  /**
   * 派生EVM地址
   */
  private async deriveEVMAddress(publicKey: string): Promise<string> {
    // 使用现有逻辑，从PKP公钥派生以太坊地址
    const ethAddress = ethers.utils.computeAddress(publicKey);
    return ethAddress;
  }
  
  /**
   * 派生Solana地址
   */
  private async deriveSolanaAddress(publicKey: string): Promise<string> {
    // 基于现有create-sol-orchestrator-lit.ts逻辑
    // 从PKP公钥派生Solana地址
    const solanaPublicKey = new PublicKey(
      await this.convertPKPToSolanaPublicKey(publicKey)
    );
    return solanaPublicKey.toString();
  }
  
  /**
   * 获取指定链的地址
   */
  getAddressForChain(chainId: ChainId): string | undefined {
    return this.pkp.chainAddresses.get(chainId);
  }
  
  /**
   * 验证地址有效性
   */
  async validateAddresses(): Promise<ValidationResult> {
    const results: ValidationResult = {
      valid: true,
      errors: []
    };
    
    for (const [chainId, address] of this.pkp.chainAddresses) {
      const isValid = await this.validateAddressForChain(chainId, address);
      if (!isValid) {
        results.valid = false;
        results.errors.push(`Invalid address for chain ${chainId}: ${address}`);
      }
    }
    
    return results;
  }
}
```

### 3. 增强的PKP创建器

```typescript
// 扩展文件: ju-actions/src/actions/auth/enhanced-pkp-creator.ts

export class EnhancedPKPCreator {
  private litNodeClient: LitNodeClient;
  private addressManager: MultiChainAddressManager;
  
  constructor(litNodeClient: LitNodeClient) {
    this.litNodeClient = litNodeClient;
  }
  
  /**
   * 创建增强版PKP
   */
  async createEnhancedPKP(
    config: PKPCreationConfig
  ): Promise<EnhancedPKP> {
    
    // 1. 创建基础PKP (基于现有逻辑)
    const basePKP = await this.createBasePKP(config);
    
    // 2. 生成多链地址
    const addressManager = new MultiChainAddressManager(basePKP);
    const chainAddresses = await addressManager.deriveChainAddresses();
    
    // 3. 设置权限和配置
    const permissions = await this.setupPermissions(config.permissions);
    const automation = await this.setupAutomation(config.automation);
    const security = await this.setupSecurity(config.security);
    
    // 4. 创建增强PKP对象
    const enhancedPKP: EnhancedPKP = {
      ...basePKP,
      chainAddresses,
      permissions,
      automation,
      security,
      status: PKPStatus.ACTIVE,
      metrics: this.initializeMetrics()
    };
    
    // 5. 注册到PKP注册表
    await this.registerPKP(enhancedPKP);
    
    return enhancedPKP;
  }
  
  /**
   * 创建基础PKP (扩展现有逻辑)
   */
  private async createBasePKP(
    config: PKPCreationConfig
  ): Promise<Partial<EnhancedPKP>> {
    
    // 基于现有create-sol-orchestrator-lit.ts的逻辑
    // 1. 准备认证方法
    const authMethods = await this.prepareAuthMethods(config);
    
    // 2. 铸造PKP NFT
    const mintInfo = await this.mintPKP(authMethods);
    
    // 3. 获取PKP信息
    const pkpInfo = await this.getPKPInfo(mintInfo.tokenId);
    
    return {
      pkpId: mintInfo.tokenId.toString(),
      publicKey: pkpInfo.publicKey,
      pkpNFTId: mintInfo.tokenId.toString()
    };
  }
  
  /**
   * 设置PKP权限
   */
  private async setupPermissions(
    config: PermissionConfig
  ): Promise<PKPPermissions> {
    
    return {
      allowedChains: config.allowedChains || Object.values(ChainId),
      allowedContracts: config.allowedContracts || [],
      allowedMethods: config.allowedMethods || [],
      automaticSigning: config.automaticSigning || false,
      conditionRules: config.conditionRules || [],
      gasLimits: new Map(config.gasLimits || []),
      dailyLimits: new Map(config.dailyLimits || []),
      rateLimits: config.rateLimits || []
    };
  }
  
  /**
   * 设置自动化配置
   */
  private async setupAutomation(
    config: AutomationConfigInput
  ): Promise<AutomationConfig> {
    
    return {
      enabled: config.enabled || false,
      triggers: config.triggers || [],
      executionRules: config.executionRules || [],
      cooldownPeriods: new Map(config.cooldownPeriods || [])
    };
  }
  
  /**
   * 配置安全设置
   */
  private async setupSecurity(
    config: SecurityConfigInput
  ): Promise<SecurityConfig> {
    
    return {
      thresholdSignature: {
        requiredSignatures: config.requiredSignatures || 2,
        totalNodes: config.totalNodes || 3,
        timeout: config.timeout || 30000
      },
      accessControl: {
        allowlist: config.allowlist || [],
        requireMFA: config.requireMFA || false,
        sessionTimeout: config.sessionTimeout || 3600000
      },
      riskControl: {
        maxTransactionValue: BigInt(config.maxTransactionValue || "1000000000000000000"), // 1 ETH
        suspiciousActivityDetection: config.suspiciousActivityDetection || true,
        emergencyPause: false
      }
    };
  }
}
```

### 4. 自动化签名管理器

```typescript
// 新文件: ju-actions/src/services/automated-signing-manager.ts

export class AutomatedSigningManager {
  private pkp: EnhancedPKP;
  private litNodeClient: LitNodeClient;
  
  constructor(pkp: EnhancedPKP, litNodeClient: LitNodeClient) {
    this.pkp = pkp;
    this.litNodeClient = litNodeClient;
  }
  
  /**
   * 自动化签名主入口
   */
  async processAutomaticSigning(
    request: SigningRequest
  ): Promise<SigningResult> {
    
    // 1. 验证请求合法性
    const validation = await this.validateSigningRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid signing request: ${validation.errors.join(', ')}`);
    }
    
    // 2. 检查权限
    const authorized = await this.checkAuthorization(request);
    if (!authorized) {
      throw new Error('Unauthorized signing request');
    }
    
    // 3. 风险评估
    const riskAssessment = await this.assessRisk(request);
    if (riskAssessment.level === RiskLevel.HIGH) {
      throw new Error('High risk transaction blocked');
    }
    
    // 4. 执行签名
    const signature = await this.executeSign(request);
    
    // 5. 记录和监控
    await this.recordSigningActivity(request, signature);
    
    return {
      signature,
      timestamp: Date.now(),
      request,
      riskLevel: riskAssessment.level
    };
  }
  
  /**
   * 执行门限签名
   */
  private async executeSign(request: SigningRequest): Promise<string> {
    
    // 准备Lit Action代码
    const litActionCode = await this.prepareLitActionCode(request);
    
    // 执行Lit Action
    const result = await this.litNodeClient.executeJs({
      code: litActionCode,
      authSig: request.authSig,
      jsParams: {
        pkpPublicKey: this.pkp.publicKey,
        chainId: request.chainId,
        transaction: request.transaction,
        permissions: this.pkp.permissions
      }
    });
    
    return result.signatures[request.chainId.toString()];
  }
  
  /**
   * 准备Lit Action代码
   */
  private async prepareLitActionCode(request: SigningRequest): Promise<string> {
    
    if (request.chainId === ChainId.SOLANA) {
      return this.getSolanaSigningCode();
    } else {
      return this.getEVMSigningCode();
    }
  }
  
  /**
   * EVM签名Lit Action代码
   */
  private getEVMSigningCode(): string {
    return `
      const go = async () => {
        // 验证权限
        const hasPermission = await checkPermissions(
          chainId, 
          transaction.to, 
          transaction.data
        );
        
        if (!hasPermission) {
          Lit.Actions.setResponse({
            response: JSON.stringify({ error: "Permission denied" })
          });
          return;
        }
        
        // 执行签名
        const signature = await Lit.Actions.signEcdsa({
          toSign: ethers.utils.arrayify(
            ethers.utils.keccak256(
              ethers.utils.serializeTransaction(transaction)
            )
          ),
          publicKey: pkpPublicKey,
          sigName: "evmSignature"
        });
        
        Lit.Actions.setResponse({
          response: JSON.stringify({ signature })
        });
      };
      
      go();
    `;
  }
  
  /**
   * Solana签名Lit Action代码
   */
  private getSolanaSigningCode(): string {
    return `
      const go = async () => {
        // 验证权限
        const hasPermission = await checkSolanaPermissions(
          transaction.instructions
        );
        
        if (!hasPermission) {
          Lit.Actions.setResponse({
            response: JSON.stringify({ error: "Permission denied" })
          });
          return;
        }
        
        // 执行签名
        const signature = await Lit.Actions.signEddsa({
          toSign: transaction.serialize(),
          publicKey: pkpPublicKey,
          sigName: "solanaSignature"
        });
        
        Lit.Actions.setResponse({
          response: JSON.stringify({ signature })
        });
      };
      
      go();
    `;
  }
  
  /**
   * 风险评估
   */
  private async assessRisk(request: SigningRequest): Promise<RiskAssessment> {
    const assessment: RiskAssessment = {
      level: RiskLevel.LOW,
      factors: [],
      score: 0
    };
    
    // 交易金额风险
    if (request.value && 
        request.value > this.pkp.security.riskControl.maxTransactionValue) {
      assessment.level = RiskLevel.HIGH;
      assessment.factors.push('High transaction value');
      assessment.score += 50;
    }
    
    // 频率风险
    const recentActivity = await this.getRecentSigningActivity();
    if (recentActivity.length > 10) { // 最近1小时超过10次
      assessment.level = RiskLevel.MEDIUM;
      assessment.factors.push('High frequency activity');
      assessment.score += 30;
    }
    
    // 新合约风险
    if (!this.isKnownContract(request.to)) {
      assessment.level = RiskLevel.MEDIUM;
      assessment.factors.push('Unknown contract');
      assessment.score += 20;
    }
    
    return assessment;
  }
}
```

### 5. 跨链权限验证器

```typescript
// 新文件: ju-actions/src/services/cross-chain-permission-validator.ts

export class CrossChainPermissionValidator {
  private pkp: EnhancedPKP;
  
  constructor(pkp: EnhancedPKP) {
    this.pkp = pkp;
  }
  
  /**
   * 验证跨链操作权限
   */
  async validateCrossChainPermission(
    operation: CrossChainOperation
  ): Promise<PermissionValidationResult> {
    
    const result: PermissionValidationResult = {
      allowed: false,
      reasons: []
    };
    
    // 1. 检查链权限
    if (!this.pkp.permissions.allowedChains.includes(operation.sourceChain) ||
        !this.pkp.permissions.allowedChains.includes(operation.targetChain)) {
      result.reasons.push('Chain not allowed');
      return result;
    }
    
    // 2. 检查合约权限
    const contractAllowed = await this.validateContractPermission(
      operation.targetContract,
      operation.targetChain
    );
    if (!contractAllowed) {
      result.reasons.push('Contract not allowed');
      return result;
    }
    
    // 3. 检查方法权限
    const methodAllowed = await this.validateMethodPermission(
      operation.method,
      operation.targetContract
    );
    if (!methodAllowed) {
      result.reasons.push('Method not allowed');
      return result;
    }
    
    // 4. 检查Gas限制
    const gasAllowed = await this.validateGasLimit(
      operation.gasLimit,
      operation.targetChain
    );
    if (!gasAllowed) {
      result.reasons.push('Gas limit exceeded');
      return result;
    }
    
    // 5. 检查频率限制
    const rateLimitOk = await this.validateRateLimit(operation);
    if (!rateLimitOk) {
      result.reasons.push('Rate limit exceeded');
      return result;
    }
    
    result.allowed = true;
    return result;
  }
  
  /**
   * 检查条件规则
   */
  async evaluateConditionRules(
    event: ChainEvent
  ): Promise<ConditionEvaluationResult> {
    
    const results: ConditionEvaluationResult[] = [];
    
    for (const rule of this.pkp.permissions.conditionRules) {
      const evaluation = await this.evaluateRule(rule, event);
      results.push(evaluation);
    }
    
    return {
      triggered: results.some(r => r.triggered),
      rules: results,
      actions: results
        .filter(r => r.triggered)
        .map(r => r.action)
    };
  }
  
  /**
   * 评估单个条件规则
   */
  private async evaluateRule(
    rule: ConditionRule,
    event: ChainEvent
  ): Promise<ConditionEvaluationResult> {
    
    // 检查事件签名匹配
    if (rule.eventSignature !== event.signature) {
      return { triggered: false, rule, action: null };
    }
    
    // 检查合约地址匹配
    if (rule.sourceContract !== event.contractAddress) {
      return { triggered: false, rule, action: null };
    }
    
    // 评估条件逻辑
    const conditionsMet = await this.evaluateConditions(
      rule.conditions,
      event.data
    );
    
    if (!conditionsMet) {
      return { triggered: false, rule, action: null };
    }
    
    // 检查冷却期
    const cooldownExpired = await this.checkCooldown(rule.id);
    if (!cooldownExpired) {
      return { triggered: false, rule, action: null };
    }
    
    return {
      triggered: true,
      rule,
      action: rule.targetAction
    };
  }
}
```

## 集成方案

### 与现有系统集成

#### 1. 扩展现有create-sol-orchestrator-lit.ts
```typescript
// 在现有文件基础上添加:
import { EnhancedPKPCreator } from './enhanced-pkp-creator';
import { MultiChainAddressManager } from '../services/multi-chain-address-manager';

// 保持现有API兼容性，添加新的增强功能选项
export async function createEnhancedSolOrchestrator(
  config: EnhancedOrchestratorConfig
): Promise<EnhancedPKP> {
  
  const creator = new EnhancedPKPCreator(litNodeClient);
  return await creator.createEnhancedPKP(config);
}
```

#### 2. 集成到ju-contracts
```solidity
// 在JUVault.sol中添加PKP验证
function validatePKPSignature(
    bytes32 messageHash,
    bytes memory signature,
    address pkpAddress
) external view returns (bool) {
    // 验证PKP签名
    return ECDSA.recover(messageHash, signature) == pkpAddress;
}
```

#### 3. 集成到ju-contracts-solana
```rust
// 在Solana程序中添加PKP验证
pub fn validate_pkp_signature(
    ctx: Context<ValidatePKPSignature>,
    message: Vec<u8>,
    signature: [u8; 64]
) -> Result<()> {
    // 验证PKP EdDSA签名
    let pubkey = ctx.accounts.pkp_account.pubkey();
    verify_ed25519_signature(&message, &signature, &pubkey)?;
    Ok(())
}
```

#### 4. 集成到off-chain-serverless
```typescript
// 在keeper-service.ts中集成PKP自动化
import { AutomatedSigningManager } from '../pkp/automated-signing-manager';

export class EnhancedKeeperService extends KeeperService {
  private signingManager: AutomatedSigningManager;
  
  async processAutomaticExecution(event: ChainEvent): Promise<void> {
    // 使用PKP自动签名和执行
    const result = await this.signingManager.processAutomaticSigning({
      event,
      chainId: event.chainId,
      operation: event.triggerOperation
    });
    
    await this.broadcastTransaction(result.signature);
  }
}
```

## 部署计划

### Phase 1: 基础PKP增强 (2周)
1. 实现MultiChainAddressManager
2. 扩展现有PKP创建逻辑  
3. 添加基础权限管理
4. 单元测试和集成测试

### Phase 2: 自动化签名 (2周)
1. 实现AutomatedSigningManager
2. 添加门限签名逻辑
3. 集成风险评估机制
4. 安全测试和验证

### Phase 3: 跨链集成 (2周)  
1. 实现CrossChainPermissionValidator
2. 集成到现有合约和程序
3. 端到端测试
4. 性能优化

通过这个增强设计，PKP系统将支持真正的多链自动化操作，同时保持高度的安全性和灵活性。