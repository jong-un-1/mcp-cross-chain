# JU Cross-Chain Protocol
## 🚀 Lit Protocol MPC网络 + 自动化跨链合约调用

这个monorepo包含了JU跨链协议的所有核心组件，现已升级为基于**Lit Protocol MPC网络**的自动化跨链合约调用系统。

## ✨ 核心技术突破

### � 目标实现
- **EVM ↔ SVM** 链之间的自动化跨链合约调用
- **EVM ↔ EVM** 兼容链之间的自动化跨链合约调用  
- **智能条件执行** - 基于链上事件的自动触发机制

### 🔐 关键技术特性
- **📱 可编程密钥对(PKPs)** - 去中心化密钥管理和多链签名
- **🔒 门限签名** - 多方计算(MPC)网络安全机制  
- **⚡ 条件执行** - 智能合约事件驱动的自动化操作
- **🌉 跨链互操作** - 统一的EVM-SVM执行环境

## �️ 增强架构概览

```
JU MPC Cross-Chain Infrastructure
├── 🔮 Lit Protocol MPC网络
│   ├── 🔐 可编程密钥对(PKPs) - 多链地址管理
│   ├── 🤝 门限签名网络 - 分布式安全验证
│   └── ⚡ Lit Actions - 自动化执行引擎
│
├── 🌐 四大工程组件
│   ├── � ju-actions (Lit Protocol集成层)
│   │   ├── PKP增强管理器 - 多链密钥派生
│   │   ├── 智能条件引擎 - 事件监听和评估
│   │   └── 自动化编排器 - 跨链执行协调
│   │
│   ├── 🔧 ju-contracts (EVM智能合约)
│   │   ├── 增强的JUVault - 支持MPC签名验证
│   │   ├── 跨链消息协议 - 标准化通信格式
│   │   └── 条件执行合约 - 自动化触发逻辑
│   │
│   ├── 🦀 ju-contracts-solana (Solana程序)
│   │   ├── MPC集成程序 - EdDSA签名验证
│   │   ├── 跨链桥接器 - EVM消息处理
│   │   └── 自动化指令 - 条件触发执行
│   │
│   └── � off-chain-serverless (监控服务)
│       ├── 增强Keeper服务 - 多链事件监听
│       ├── 智能触发器 - 条件评估引擎
│       └── MPC协调器 - 网络状态管理
│
└── �️ 自动化执行流程
    ├── 📡 实时事件监听 (多链并行)
    ├── 🧠 智能条件评估 (AI辅助决策)
    ├── 🔐 MPC网络验证 (门限签名)
    └── ⚡ 自动化执行 (跨链合约调用)
```

### 🎯 生产级特性

| **MPC自动化功能** | **技术实现** | **状态** |
|------------------|-------------|----------|
| **跨链事件监听** | 多链实时WebSocket + 事件过滤 | 🔄 **开发中** |
| **智能条件执行** | Lit Actions + 复杂逻辑引擎 | 🔄 **开发中** |
| **门限签名验证** | MPC网络 + PKP自动签名 | 🔄 **开发中** |
| **EVM-SVM桥接** | 统一跨链消息协议 | 🔄 **开发中** |
| **风险智能评估** | AI辅助 + 多层安全检查 | 🔄 **开发中** |
| **自动化Gas优化** | 智能Gas价格预测 + 批量执行 | 🔄 **开发中** |

### 🏢 技术架构升级

- **核心技术**: Lit Protocol MPC网络 + Lit Actions
- **支持链**: Ethereum, BSC, Polygon, Arbitrum, Optimism + Solana
- **自动化引擎**: 智能条件执行 + 事件驱动触发  
- **安全模型**: 门限签名 + 去中心化密钥管理

## � MPC自动化跨链系统快速开始

### 📋 前提条件

```bash
# 1. 安装依赖
node >= 18.0.0
rust >= 1.70.0
foundry >= 0.2.0

# 2. 环境配置
git clone https://github.com/jong-un-1/ju-cross-chain.git
cd ju-cross-chain
```

### ⚡ 快速部署

#### 1. 设置环境变量
```bash
# Lit Protocol配置
export LIT_NETWORK="cayenne"  # 或 "datil-dev" for testnet
export LIT_NETWORK_RPC="https://cayenne-rpc.litprotocol.com"

# 区块链RPC配置
export ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
export BSC_RPC_URL="https://bsc-dataseed1.binance.org"

# PKP配置  
export PKP_MASTER_SEED="your-secure-seed-phrase"
export PKP_AUTH_METHOD="webauthn"  # 或 "google_oauth"
```

#### 2. 部署核心组件
```bash
# 部署EVM合约
cd ju-contracts
forge script script/DeployMPCVault.s.sol --broadcast --verify

# 部署Solana程序
cd ../ju-contracts-solana  
anchor build && anchor deploy

# 启动自动化服务
cd ../off-chain-serverlss
npm install && npm run deploy:microservices

# 配置Lit Actions
cd ../ju-actions
npm install && npm run setup:pkp
```

### 🎯 基础使用示例

#### 创建增强版PKP
```typescript
import { JUCrossChainSDK } from '@ju/sdk';

const sdk = new JUCrossChainSDK({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// 创建支持多链的PKP
const pkp = await sdk.pkp.createEnhancedPKP({
  permissions: {
    allowedChains: [ChainId.ETHEREUM, ChainId.SOLANA, ChainId.BSC],
    automaticSigning: true,
    gasLimits: new Map([
      [ChainId.ETHEREUM, BigInt('500000')],
      [ChainId.SOLANA, BigInt('200000')]
    ])
  },
  automation: {
    enabled: true,
    triggers: [{
      type: 'event',
      chainId: ChainId.ETHEREUM,
      contractAddress: '0x...',
      eventSignature: 'Transfer(address,address,uint256)'
    }]
  }
});

console.log('PKP创建成功:', pkp.pkpId);
console.log('多链地址:', pkp.chainAddresses);
```

#### 配置自动化跨链条件
```typescript
// 设置智能条件规则
const rule = await sdk.rules.createRule({
  name: "自动化ETH->SOL桥接",
  trigger: {
    eventConditions: [{
      chainId: ChainId.ETHEREUM,
      contractAddress: '0xa0b86a33e6c0000b0000f6e000000000c00000f00', // USDC
      eventSignature: 'Transfer(address,address,uint256)',
      parameterFilters: [{
        parameterName: 'value',
        operator: 'gte',
        value: ethers.utils.parseUnits('1000', 6) // >= 1000 USDC
      }]
    }],
    timeConditions: [{
      type: 'cooldown',
      cooldownPeriod: 300000 // 5分钟冷却期
    }]
  },
  actions: [{
    type: 'crossChainCall',
    config: {
      sourceChain: ChainId.ETHEREUM,
      targetChain: ChainId.SOLANA,
      targetContract: 'JUVaultProgram',
      method: 'auto_bridge_usdc',
      params: ['{{event.args.value}}'], // 使用事件参数
      pkpId: pkp.pkpId
    }
  }]
});

console.log('自动化规则创建成功:', rule.id);
```

#### 监控执行状态
```typescript
// 实时监控自动化执行
sdk.events.subscribeSystemEvents({
  eventTypes: ['execution_started', 'execution_completed', 'execution_failed'],
  callback: async (events) => {
    for (const event of events) {
      console.log(`执行事件: ${event.type}`, event.data);
    }
  }
});

// 获取执行统计
const stats = await sdk.monitoring.getExecutionStats({
  timeRange: { start: Date.now() - 86400000, end: Date.now() } // 24小时
});

console.log('24小时执行统计:', {
  总执行次数: stats.totalExecutions,
  成功率: `${stats.successRate}%`,
  平均执行时间: `${stats.averageExecutionTime}ms`,
  总Gas消耗: stats.totalGasUsed.toString()
});
```

## 🔐 核心基础设施: Lit Protocol MPC网络

[**Lit Protocol**](https://litprotocol.com/) 为JU生态系统提供**去中心化密钥管理和自动化执行**基础设施，实现真正的无需信任跨链操作。

### 🛡️ 什么是Lit Protocol?

Lit Protocol是业界领先的**去中心化密钥管理和计算网络**，通过MPC(多方计算)技术提供可编程密钥对(PKPs)和自动化执行能力。

### 🔧 Lit Protocol在JU中的作用

| **功能** | **技术实现** | **安全优势** |
|---------|-------------|-------------|
| **PKP密钥管理** | 分布式门限签名生成 | 无单点故障，密钥永不泄露 |
| **自动化签名** | Lit Actions条件执行 | 智能合约级别的自动化安全 |
| **跨链验证** | MPC网络共识机制 | 多节点验证确保操作安全 |
| **条件执行** | 事件驱动的智能触发 | 去中心化的可编程自动化 |
| **多链支持** | 统一的EVM+SVM密钥管理 | 一套密钥管理所有链的资产 |

### 🏭 MPC网络安全特性

- **🔒 门限签名**: 分布式密钥生成，无单点故障
- **🔍 可验证计算**: 开源代码 + 密码学证明
- **📋 去中心化**: 多节点网络，无中心化风险
- **🛡️ 安全审计**: 顶级安全公司多轮审计
- **⚡ 高性能**: 毫秒级签名响应时间

### 🤝 Lit Protocol + PKP自动化架构

JU系统利用**Lit Protocol MPC网络**实现完全去中心化的自动化跨链操作:

```
智能条件监听 (Multi-Chain) → MPC网络验证 (Lit Protocol) → 自动化执行 (Cross-Chain)
├── � 实时事件监听           ├── 🔐 可编程密钥对(PKPs)       ├── 🌉 跨链桥接操作
├── 🧠 条件智能评估          ├── 🔒 门限签名验证            ├── 💱 DEX路由聚合  
├── 📱 AI辅助决策           ├── 🤖 Lit Actions执行        ├── 🔄 流动性自动重平衡
└── 🎯 风险智能控制          └── 🧾 分布式共识验证          └── 💸 Gas费用优化
```

### 🌟 MPC自动化为用户带来的价值

- **🚀 智能自动化**: 基于链上事件的自动跨链操作
- **🔐 极致安全**: PKP密钥永不暴露，MPC网络保护  
- **⚡ 毫秒执行**: 去中心化网络的高速响应
- **🌍 真正跨链**: EVM和SVM链的统一自动化
- **📱 无感操作**: 用户设置条件后自动执行
- **🛡️ 企业级**: 与主流DeFi协议相同的安全标准

## 📁 增强项目结构

### 🔧 JU EVM Contracts (`ju-contracts/`)
**总代码行数**: 2,180+ (增强中)

EVM兼容区块链的核心智能合约，现已增强支持MPC自动化:

| 合约 | 描述 | 代码行数 | MPC增强 |
|------|------|---------|----------|
| `JUVaultCore.sol` | 核心金库实现，支持可升级功能。处理质押、流动性管理、订单处理和跨链操作。 | 790 | 🔄 **PKP签名验证** |
| `JUVault.sol` | 主金库合约，处理跨链稳定币桥接和价格保护存款。集成Chainlink价格源。 | 149 | 🔄 **自动化触发器** |
| `JURouter.sol` | 路由聚合器合约，单交易执行多次调用。支持代币交换和跨链订单创建。 | 251 | 🔄 **条件执行逻辑** |
| `JUProxyCall.sol` | 代理合约，执行批量交易和管理代币授权。提供安全的外部调用执行。 | 352 | 🔄 **MPC权限验证** |
| `fees/FeeCollector.sol` | 处理JU协议中的费用计算、收集和分配 | 612 | 🔄 **自动化费用管理** |

### 🎯 JU Actions (`ju-actions/`) 
**总代码行数**: 8,274+ (大幅增强中)

Lit Protocol集成层，现已升级为MPC自动化引擎:

#### 📂 增强的目录结构
```
ju-actions/
├── 🔧 src/
│   ├── 🎯 actions/ (Lit Actions核心)
│   │   ├── auth/ - PKP创建和管理
│   │   │   ├── create-sol-orchestrator-lit.ts (✅ 现有)
│   │   │   └── enhanced-pkp-creator.ts (🔄 新增)
│   │   ├── solver/ - 自动化执行器
│   │   │   ├── solver-lit-impl.ts (✅ 现有)  
│   │   │   └── cross-chain-executor.ts (🔄 新增)
│   │   └── 🔄 engines/ (新增 - 智能引擎)
│   │       ├── smart-condition-engine.ts
│   │       ├── risk-assessment-engine.ts
│   │       └── execution-orchestrator.ts
│   │
│   ├── 🌐 services/ (区块链服务)
│   │   ├── evm/ - EVM链集成服务
│   │   ├── solana/ - Solana集成服务  
│   │   ├── lit-services/ - Lit Protocol服务
│   │   │   ├── encryptor-lit.ts (✅ 现有)
│   │   │   └── 🔄 pkp-manager.ts (增强)
│   │   └── 🔄 monitoring/ (新增 - 监控服务)
│   │       ├── multi-chain-monitor.ts
│   │       ├── event-processor.ts
│   │       └── alert-manager.ts
│   │
│   ├── 🔄 types/ (新增 - 类型定义)
│   │   ├── enhanced-pkp.ts
│   │   ├── conditions.ts
│   │   ├── execution.ts
│   │   └── events.ts
│   │
│   └── 🔄 utils/ (增强工具函数)
│       ├── address-utils.ts (✅ 现有)
│       ├── encoding-utils.ts (✅ 现有)
│       └── 🔄 mpc-utils.ts (新增)
```

#### 🚀 核心增强功能
- **🔐 增强PKP管理器** - 多链地址派生和权限控制
- **🧠 智能条件引擎** - 复杂事件监听和条件评估  
- **⚡ 执行编排器** - 自动化跨链操作协调
- **📡 多链监控器** - 实时事件捕获和处理
- **🛡️ 风险评估引擎** - AI驱动的安全评估

### � JU Solana Contracts (`ju-contracts-solana/`)
**总代码行数**: 2,500+ (增强中)

Solana区块链程序，现已增强支持EVM桥接和MPC验证:

#### 📂 增强的程序结构  
```
ju-contracts-solana/
├── 🦀 programs/ju/src/
│   ├── lib.rs (✅ 主程序入口)
│   ├── 🔄 instructions/ (增强指令)
│   │   ├── create_order.rs (✅ 现有)
│   │   ├── fill_order.rs (✅ 现有)
│   │   ├── 🔄 validate_pkp_signature.rs (新增)
│   │   ├── 🔄 process_evm_message.rs (新增)
│   │   └── 🔄 auto_execute_condition.rs (新增)
│   │
│   ├── 🔄 state/ (增强状态管理)
│   │   ├── global_state.rs (✅ 现有)
│   │   ├── 🔄 pkp_registry.rs (新增)
│   │   ├── 🔄 condition_rules.rs (新增) 
│   │   └── 🔄 cross_chain_messages.rs (新增)
│   │
│   └── 🔄 utils/ (新增工具)
│       ├── signature_verification.rs
│       ├── message_parsing.rs
│       └── condition_evaluation.rs
```

#### 🚀 MPC集成特性
- **🔐 PKP签名验证** - EdDSA签名验证支持
- **🌉 EVM消息处理** - 跨链消息解析和执行
- **⚡ 自动化指令** - 条件触发的程序执行  
- **📊 状态同步** - 跨链状态一致性管理

### 🚀 Off-Chain Serverless (`off-chain-serverlss/`)
**总代码行数**: 1,500+ (大幅增强中)

微服务架构，现已升级为智能自动化监控系统:

#### 📂 增强的服务结构
```
off-chain-serverlss/
├── 🌐 src/
│   ├── 🔄 services/ (增强服务)
│   │   ├── keeper/ 
│   │   │   ├── keeper-service.ts (✅ 现有基础)
│   │   │   └── 🔄 enhanced-keeper.ts (MPC增强)
│   │   ├── 🔄 condition-engine/ (新增)
│   │   │   ├── event-monitor.ts
│   │   │   ├── rule-processor.ts
│   │   │   └── execution-coordinator.ts
│   │   ├── funder/ - 资金管理服务
│   │   ├── indexer/ - 区块链数据索引
│   │   ├── watcher/ - 状态监控服务
│   │   └── quoter/ - 价格和路由服务
│   │
│   ├── 🔄 core/ (新增核心)
│   │   ├── base-service.ts (✅ 现有)
│   │   ├── 🔄 mpc-coordinator.ts (新增)
│   │   ├── 🔄 risk-manager.ts (新增)
│   │   └── 🔄 performance-monitor.ts (新增)
│   │
│   └── 🔄 types/ (增强类型)
│       ├── service-types.ts (✅ 现有)
│       ├── 🔄 mpc-types.ts (新增)
│       └── 🔄 automation-types.ts (新增)
```

## � MPC自动化实施路线图

### 🎯 Phase 1: 基础设施增强 (4-6周)
- [ ] **PKP多链支持扩展** - 增强现有PKP支持多链操作
- [ ] **Lit Actions跨链能力** - 扩展solver支持跨链调用  
- [ ] **监控服务升级** - keeper-service支持多链事件监听
- [ ] **基础集成测试** - 确保组件间兼容性

### 🎯 Phase 2: 智能执行引擎 (6-8周)  
- [ ] **条件执行引擎开发** - 实时事件监听和智能评估
- [ ] **跨链消息协议** - 标准化EVM-SVM通信格式
- [ ] **MPC网络集成** - 门限签名和自动化验证
- [ ] **风险管理系统** - 多层安全检查和控制

### 🎯 Phase 3: 生产优化 (4-6周)
- [ ] **性能优化** - 网络延迟和Gas费用优化
- [ ] **用户界面开发** - 管理控制台和监控面板
- [ ] **安全审计** - 第三方安全审计和验证
- [ ] **生产部署** - 主网部署和监控

## 🛡️ 安全和审计

### 🔒 现有安全保障
此协议已通过业界领先安全公司的专业审计:

- **Hacken审计** (2025年1月27日): `ju-contracts/audits/hacken-27-01-2025.pdf`
- **Halborn审计** (2024年12月2日): `ju-contracts/audits/halborn-02-12-2024.pdf`  
- **Borg Research**: 额外安全审查
- **HackenProof**: 持续安全监控

### 🔐 MPC安全增强计划
- **Lit Protocol审计**: MPC网络和PKP安全验证
- **跨链桥接审计**: EVM-SVM消息协议安全性
- **自动化逻辑审计**: 条件执行引擎安全评估
- **端到端测试**: 完整自动化流程安全验证

### 🏆 Cantina竞赛验证
- **总奖金池**: $30,000 ($25,000公开 + $5,000专家)
- **竞赛期间**: 2025年7月3-24日
- **提交发现**: 390个
- **重点领域**: Lit Actions和系统安全

### 🚀 智能自动化
- **📡 实时多链监听** - 同时监控EVM和Solana链上事件
- **🧠 智能条件评估** - 支持复杂逻辑组合和AI辅助决策  
- **⚡ 自动化执行** - PKP驱动的无需人工干预操作
- **🔄 自适应重平衡** - 根据链上状态自动调整策略

### 🔐 MPC网络安全
- **🔒 门限签名** - 多节点验证，无单点故障
- **🛡️ 分布式密钥** - PKP密钥永不暴露或集中存储
- **📊 实时风险评估** - 多维度安全检查和控制
- **🚨 智能熔断** - 异常情况自动暂停保护资金

### � 统一跨链体验  
- **🔄 EVM ↔ SVM桥接** - 以太坊生态与Solana的无缝连接
- **💱 智能路由** - 自动选择最优跨链路径和费用
- **⚡ 毫秒级执行** - MPC网络的高速响应能力
- **📱 一键设置** - 用户友好的自动化规则配置

### 📊 企业级监控
- **📈 实时仪表板** - 系统状态和性能指标可视化
- **🔍 全链路追踪** - 完整的执行路径和状态记录
- **📋 合规报告** - 自动生成审计和合规文档
- **🚨 智能告警** - 基于AI的异常检测和通知

## 🚀 开始使用

### 📖 文档资源
- **[架构设计](./docs/mpc-cross-chain-architecture.md)** - 完整的系统架构和技术方案
- **[实施计划](./docs/implementation-plan.md)** - 分阶段的开发路线图
- **[PKP增强设计](./docs/pkp-enhanced-design.md)** - 可编程密钥对的增强方案
- **[智能条件引擎](./docs/smart-condition-engine-design.md)** - 条件执行引擎设计
- **[技术规范](./docs/technical-specification.md)** - API接口和数据结构定义

### 🛠️ 开发者资源
```bash
# 克隆仓库
git clone https://github.com/jong-un-1/ju-cross-chain.git
cd ju-cross-chain

# 查看架构文档
cat docs/mpc-cross-chain-architecture.md

# 查看实施计划
cat docs/implementation-plan.md

# 查看技术规范
cat docs/technical-specification.md
```

### 🔗 相关链接
- **生产平台**: [TradeJU.com](https://www.tradegenius.com) 
- **桥接应用**: [app.bridgesmarter.com](https://app.bridgesmarter.com)
- **Lit Protocol**: [litprotocol.com](https://litprotocol.com)
- **技术博客**: 即将发布MPC自动化技术深度解析

## 🤝 贡献指南

### 💡 如何参与
1. **🍴 Fork** 此仓库
2. **🌿 创建特性分支** (`git checkout -b feature/mpc-enhancement`)
3. **💾 提交更改** (`git commit -am 'Add MPC automation feature'`)
4. **📤 推送分支** (`git push origin feature/mpc-enhancement`)
5. **🔀 创建Pull Request**

### 🎯 优先贡献领域
- **🔐 PKP增强功能** - 多链密钥管理优化
- **🧠 智能条件引擎** - 复杂逻辑和AI集成
- **⚡ 跨链性能优化** - 执行速度和成本优化
- **🛡️ 安全机制增强** - 风险评估和防护措施
- **📚 文档和示例** - 使用指南和最佳实践

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**🌟 构建未来的去中心化跨链自动化基础设施 🌟**

*基于 Lit Protocol MPC网络 | 支持 EVM ↔ SVM 自动化 | 企业级安全保障*

[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/TradeJU)
[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/tradegenius)
[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/tradegeniusofficial)

</div>

### Cross-Chain Functionality
- **Multi-chain Support**: EVM and Solana blockchain integration
- **Stablecoin Bridge**: Cross-chain stablecoin transfers with price protection
- **Order Management**: Create, fill, and revert cross-chain orders
- **Liquidity Management**: Automated rebalancing across chains

### Security Features
- **Upgradeable Contracts**: UUPS proxy pattern for future improvements
- **Access Control**: Role-based permissions (Admin, Pauser, Orchestrator)
- **Reentrancy Protection**: SafeGuard against reentrancy attacks
- **Price Verification**: Chainlink integration for stablecoin price validation

### ERC20 Token Features
- **gUSD Token**: "JU USD" representing staked assets
- **Staking/Unstaking**: Deposit USDC to receive gUSD, redeem gUSD for USDC
- **Fee Collection**: Automated fee calculation and distribution

## ✅ Production Integration Verification

The relationship between this repository and [TradeJU.com](https://www.tradegenius.com) is verified through:

### 🔧 Code Integration Points
- **Authentication Origin**: `ju-actions/scripts/utils/wallet-auth-sig.ts` references `https://tradegenius.com`
- **Lit Protocol Integration**: Direct usage in production for decentralized orchestration
- **Multi-chain Support**: Live deployment across Ethereum, Base, Arbitrum, Optimism, BNB, Polygon, Avalanche, Solana

### 🏢 Corporate Verification
- **Shuttle Labs, Inc**: Operating company for TradeJU.com platform
- **JU Foundation**: Development organization for this protocol
- **Consistent Branding**: Unified "JU" ecosystem across all platforms

### 🛡️ Infrastructure Security Alignment  
- **Smart Contract Audits**: Halborn, Hacken, Cantina, Borg Research, HackenProof
- **Turnkey Security Audits**: Trail of Bits, Cure53, Zellic, Distrust, SOC 2 Type II
- **Production Security**: Live platform uses audited smart contracts + Turnkey infrastructure
- **Non-Custodial Verification**: TradeJU.com FAQ explicitly confirms Turnkey integration
- **Key Management**: Enterprise-grade Turnkey.com + Lit Protocol for decentralized operations

## 🚀 Build Instructions

### JU EVM Contracts
```bash
cd ju-contracts
forge build --via-ir
```

**Deployment**:
```bash
forge script script/deployment/DeployOptimismJUEcosystem.s.sol --rpc-url $OPTIMISM_RPC_URL --broadcast --via-ir
```

### JU Actions
```bash
cd ju-actions
npm run build:esbuild
```

### JU Solana Contracts
```bash
cd ju-contracts-solana
anchor build
```

**Deployment**:
```bash
solana program deploy target/deploy/ju.so --program-id --with-compute-unit-price 500000 --max-sign-attempts 300 --use-rpc
```

## 🎯 Competition Scope

### In Scope
- **Lit Actions**: Primary focus area for security research
- **Smart Contract Integration**: Cross-chain functionality and system interactions
- **Order Processing**: Creation, fulfillment, and reversal mechanisms

### Out of Scope
- Centralization risks (orchestrators considered secure)
- Liquidity shortage scenarios (handled by rebalancing)
- Lit PKPs and encryption mechanisms (considered secure)
- Previously identified issues from audits and security reviews

## 🔗 Additional Resources

### 🌐 Live Platform & Applications
- **[TradeJU.com](https://www.tradegenius.com)** - Primary trading terminal (Production)
- **[TradeJU.com (中文)](https://www.tradegenius.com/zh)** - Chinese language interface
- **[Bridge Application](https://app.bridgesmarter.com/)** - Direct bridge interface
- **[Documentation](http://docs.tradegenius.com/)** - Technical documentation

### 🛡️ Security & Infrastructure
- **[Turnkey.com](https://www.turnkey.com/)** - Non-custodial key management infrastructure
- **[Turnkey Documentation](https://docs.turnkey.com/)** - Technical integration docs
- **[Cantina Competition](https://cantina.xyz/competitions/12acc80c-4e4c-4081-a0a3-faa92150651a)** - Security competition details
- **[Code Walkthrough Video](https://youtu.be/1AVFPtIt334)** - Technical walkthrough
- **[Lit Protocol Docs](https://developer.litprotocol.com/sdk/serverless-signing/overview)** - Lit Protocol documentation

### 💬 Community & Support
- **[Twitter](https://twitter.com/JUTerminal)** - Official announcements
- **[Discord](https://discord.gg/geniusterminal)** - Community support
- **[Telegram](https://t.me/geniusverification)** - Verification channel
- **[Medium Blog](https://medium.com/@tradegenius)** - Technical articles

### 📊 Corporate Information
- **[Seed Round Announcement](https://x.com/JUTerminal/status/1849105492754452559)** - $6M funding news
- **[Media Assets](https://drive.google.com/drive/folders/1ZFwkmL0a80BRyQZQ5msaE3U9F5YI_8-?usp=drive_link)** - Brand resources

## 📞 Contact

For issues or questions regarding this protocol, please reach out through the appropriate channels in the Cantina Discord or official JU Foundation channels.
