# Audit Scope - Genius Actions

The Genius Actions are off-chain javascript programs running on the Lit Network and serve as orchestration layer for the Genius Bridge.
Lit actions are responsible for solving orders, rebalancing liquidity, and providing order invalidity certificates.

## Overview

Genius Actions is a decentralized orchestration system built on the Lit Network that manages cross-chain bridge operations between Solana and EVM chains. The system uses Programmable Key Pairs (PKPs) for EVM chains and encrypted keys for Solana to ensure secure, decentralized execution of critical bridge operations.

### Key Components

1. **Solver Actions**: Execute order fills across different chains
2. **Rebalancing Actions**: Manage liquidity distribution across supported chains
3. **Refund Orchestrator**: Withdraw funds stored by orchestrators (ETH for transaction execution) to enable orchestrator rotation and proxy changes
4. **Revert Order Signature**: Provide order invalidity certificates
5. **Authentication Actions**: Manage PKP creation and key encryption

## Architecture

### Proxy Pattern Implementation

The system implements a proxy pattern for solver and rebalancing actions to enable dynamic logic updates:

- **Proxy Contracts**: On-chain repository on Base managed by admin address
- **Implementation Keys**: Key-value pairs storing action implementation hashes
- **Execution Binding**: Execution keys remain bound to proxy contracts (hash doesn't change)
- **Dynamic Updates**: Logic can be updated by changing implementation hashes

### Multi-Action Flow for Rebalancing

Due to Lit Network limitations (HTTP call limits, 30s timeouts), rebalancing uses a two-phase approach:

1. **Instructions Action**: Computes rebalancing actions and signs them
2. **Execution Actions**: Executes signed actions using compatible bridges

## Audit Scope

### In Scope

#### 1. Solver Actions (`src/actions/solver/`)

**Core Components:**
- `SolverBase.ts` - Abstract base class with common functionality
- `EvmSolver.ts` - EVM-specific solver implementation
- `SolanaSolver.ts` - Solana-specific solver implementation
- `SolverFactory.ts` - Factory pattern for solver instantiation

**Proxy Pattern:**
- `solver-proxy-base.ts` - Base proxy implementation
- `solver-proxy-*.ts` - Environment-specific proxies (dev, staging, test)

**Key Security Areas:**
- Order parameter validation and verification
- Cross-chain transaction execution
- PKP/EVM key management
- Solana encrypted key handling
- Transaction serialization and signing
- Error handling and fallback mechanisms

#### 2. Rebalancing Actions (`src/actions/rebalancing/`)

**Core Components:**
- `rebalancing-instructions.ts` - Computes and signs rebalancing actions
- `rebalancing-execution-impl.ts` - Executes signed rebalancing actions
- `compute-rebalancing.ts` - Rebalancing algorithm implementation

**Proxy Pattern:**
- `rebalancing-execution-proxy.ts` - Base proxy implementation
- `rebalancing-execution-proxy-*.ts` - Environment-specific proxies

**Key Security Areas:**
- Signature validation and timestamp verification
- Bridge selection and quote fetching
- Cross-chain liquidity transfers
- Vault balance verification
- Rebalancing algorithm correctness
- Batch processing security

#### 3. Lit Services (`src/services/lit-services/`)

**Core Services:**
- `execution-handler/` - Transaction execution interface and implementation
- `orchestrator/` - Orchestration logic for multi-action flows
- `encryptor/` - Encryption/decryption services
- `error-handler/` - Error handling and recovery mechanisms
- `lit-helpers/` - Lit Network utility functions

**Key Security Areas:**
- PKP key management and signing
- Solana key encryption/decryption
- Transaction execution security
- Error handling and recovery
- Access control and authentication

#### 4. Blockchain Services (`src/services/blockchain/`)

**Vault Management:**
- `genius-evm-vault.ts` - EVM vault operations
- `genius-solana-pool.ts` - Solana pool operations
- `svm-*` - Solana-specific utilities

**Action Management:**
- `ju-actions.service.ts` - On-chain action implementation management

**Key Security Areas:**
- Vault balance verification
- Order validation and processing
- Cross-chain state synchronization
- Transaction building and validation

#### 5. Utilities (`src/utils/`)

**Key Security Areas:**
- Address validation and transformation
- Transaction serialization
- Signature encoding/validation
- RPC management and failover

### Out of Scope

- `src/services/bridges/` - Bridge implementations
- `src/services/aggregators/` - Aggregator services
- Test files and documentation
- Build configurations and scripts

## Security Considerations

### Critical Areas

1. **Key Management**
   - PKP creation and usage for EVM chains
   - Solana key encryption/decryption in TEE
   - Access control conditions and permissions

2. **Cross-Chain Operations**
   - Order validation across different chains
   - State consistency between chains
   - Transaction atomicity and rollback mechanisms

3. **Signature Validation**
   - Timestamp verification and replay protection
   - Multi-signature validation for PKPs
   - Signature encoding and verification

4. **Proxy Pattern Security**
   - Implementation hash validation
   - Admin access control for implementation updates
   - Proxy contract security

5. **Rebalancing Algorithm**
   - Mathematical correctness of rebalancing calculations
   - Slippage protection and limits
   - Bridge selection logic and security

6. **Error Handling**
   - Graceful degradation and fallback mechanisms
   - Error recovery and state consistency
   - Timeout handling and retry logic

### Attack Vectors

1. **Key Compromise**
   - PKP private key exposure
   - Solana key decryption bypass
   - Unauthorized access to orchestrator keys

2. **Replay Attacks**
   - Signature replay across different contexts
   - Timestamp manipulation
   - Order replay attacks

3. **Cross-Chain Attacks**
   - State inconsistency exploitation
   - Double-spending across chains
   - Bridge manipulation

4. **Proxy Manipulation**
   - Unauthorized implementation updates
   - Malicious implementation injection
   - Admin key compromise

5. **Algorithmic Attacks**
   - Rebalancing algorithm manipulation
   - Slippage exploitation
   - MEV extraction

## Documentation Requirements

Auditors should focus on understanding:

1. **Architecture Diagrams**
   - System component interactions
   - Data flow between components
   - Security boundaries

2. **Key Management Flow**
   - PKP creation and usage
   - Solana key encryption/decryption
   - Access control mechanisms

3. **Transaction Lifecycle**
   - Order processing flow
   - Rebalancing execution flow
   - Error handling and recovery

4. **Security Model**
   - Trust assumptions
   - Attack surface analysis
   - Mitigation strategies