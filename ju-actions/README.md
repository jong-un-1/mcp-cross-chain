# Genius Actions

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

Genius Actions is a decentralized orchestration system built on the Lit Network that manages cross-chain bridge operations between Solana and EVM chains. The system uses Programmable Key Pairs (PKPs) for EVM chains and encrypted keys for Solana to ensure secure, decentralized execution of critical bridge operations.

## 🏗️ Architecture

### Overview

Genius Actions serves as the orchestration layer for the Genius Bridge, providing secure and decentralized execution of:

- **Order Solving**: Execute order fills across different chains
- **Liquidity Rebalancing**: Manage liquidity distribution across supported chains
- **Refund Operations**: Withdraw funds from orchestrators for rotation and updates
- **Order Invalidation**: Provide order invalidity certificates

### Key Components

#### 1. Solver Actions (`src/actions/solver/`)
- **Purpose**: Execute order fills across different chains
- **Architecture**: Uses proxy pattern for dynamic logic updates
- **Key Features**:
  - Cross-chain transaction execution
  - Order parameter validation
  - PKP/EVM key management
  - Solana encrypted key handling

#### 2. Rebalancing Actions (`src/actions/rebalancing/`)
- **Purpose**: Manage liquidity distribution across supported chains
- **Architecture**: Two-phase approach due to Lit Network limitations
  - **Instructions Phase**: Compute and sign rebalancing actions
  - **Execution Phase**: Execute signed actions using compatible bridges
- **Key Features**:
  - Signature validation and timestamp verification
  - Bridge selection and quote fetching
  - Cross-chain liquidity transfers
  - Vault balance verification

#### 3. Refund Orchestrator (`src/actions/refund-orchestrator/`)
- **Purpose**: Withdraw funds stored by orchestrators (ETH for transaction execution)
- **Use Cases**: Orchestrator rotation and proxy changes
- **Key Features**:
  - Secure fund recovery
  - Multi-chain support
  - Access control validation

#### 4. Authentication Actions (`src/actions/auth/`)
- **Purpose**: Manage PKP creation and key encryption
- **Key Features**:
  - PKP creation for EVM chains
  - Solana key encryption/decryption
  - Access control management

### Proxy Pattern Implementation

The system implements a proxy pattern for solver and rebalancing actions:

- **Proxy Contracts**: On-chain repository on Base managed by admin address
- **Implementation Keys**: Key-value pairs storing action implementation hashes
- **Execution Binding**: Execution keys remain bound to proxy contracts
- **Dynamic Updates**: Logic can be updated by changing implementation hashes

### Multi-Action Flow for Rebalancing

Due to Lit Network limitations (HTTP call limits, 30s timeouts), rebalancing uses a two-phase approach:

1. **Instructions Action**: Computes rebalancing actions and signs them
2. **Execution Actions**: Executes signed actions using compatible bridges

## 📁 Project Structure

```
genius-actions/
├── src/
│   ├── actions/                 # Lit Actions implementations
│   │   ├── auth/               # Authentication and key management
│   │   ├── rebalancing/        # Liquidity rebalancing actions
│   │   ├── refund-orchestrator/ # Fund withdrawal operations
│   │   ├── revert-order-sig/   # Order invalidation
│   │   └── solver/             # Order solving actions
│   ├── services/               # Core services
│   │   ├── blockchain/         # Blockchain interactions
│   │   ├── lit-services/       # Lit Network services
│   │   └── aggregators/        # Price aggregators (out of scope)
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── scripts/                    # Build and deployment scripts
├── test/                       # Test files
├── docs/                       # Documentation
└── package.json
```

## 🔧 Development

### Building

```bash
# Build with esbuild
npm run build:esbuild
```

### Testing

The project uses Jest for testing with the following test categories:

- **Unit Tests**: Individual component functionality
- **E2E Tests**: End-to-end integration tests
- **Lit Action Tests**: Specific tests for Lit Network actions

## 🔐 Security

### Key Management

- **EVM Chains**: Uses Programmable Key Pairs (PKPs) with MPC systems
- **Solana**: Uses encrypted keys requiring majority node consensus for decryption
- **Access Control**: Limited scope keys with specific action permissions

### Security Considerations

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
   - Signature encoding and verification

## 📚 Documentation

- [Audit Scope](./docs/audit-scope.md) - Comprehensive audit documentation
- [SVM Architecture Flowchart](./docs/svm-architecture-flowchart.md) - Solana VM architecture
- [SVM Sequence Diagram](./docs/svm-sequence-diagram.md) - Solana VM sequence flows