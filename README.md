# Genius Cross-Chain Protocol

This monorepo contains all the repositories for the Genius cross-chain protocol, which participated in the Cantina security competition.

## 🌟 Overview

Genius is the first way to buy anything, anywhere from 1 place while you retain full custody of your assets. We believe in a future where thousands of tokens are traded across hundreds of chains - Genius is the decentralized layer to facilitate these transactions in a fast, safe, and compliant way.

## 📁 Repository Structure

### 🔧 Genius EVM Contracts (`genius-contracts/`)
**Total LOC**: 2,180

Core smart contracts for Ethereum Virtual Machine compatible blockchains:

| Contract | Description | LOC |
|----------|-------------|-----|
| `GeniusVaultCore.sol` | Core vault implementation with upgradeable functionality. Handles staking, liquidity management, order processing, and cross-chain operations. Implements ERC20 token functionality with access control and reentrancy protection. | 790 |
| `GeniusVault.sol` | Main vault contract that handles cross-chain stablecoin bridge with price-based deposit protection. Inherits from GeniusVaultCore and implements order creation with stablecoin price verification using Chainlink feeds. | 149 |
| `GeniusRouter.sol` | Router contract for aggregating multiple calls in single transactions. Facilitates token swaps and cross-chain order creation using both standard approvals and Permit2. Integrates with vault, proxy call, and fee collector contracts. | 251 |
| `GeniusProxyCall.sol` | Proxy contract for executing batched transactions and managing token approvals. Provides safe execution of external calls with proper token handling, balance verification, and access control. | 352 |
| `GeniusMulticall.sol` | Multicall contract for executing multiple transactions in a single call. Inherits from MultiSendCallOnly and handles native token refunds. | 26 |
| `fees/FeeCollector.sol` | Handles the calculation, collection, and distribution of fees in the Genius protocol | 612 |

### 🦾 Genius Actions (`genius-actions/`)
**Total LOC**: 8,274

TypeScript/JavaScript implementation for Lit Protocol actions:

- **Actions**: Core Lit Actions for cross-chain operations
- **Services**: Blockchain services for EVM and Solana integration
  - ERC725Y service
  - Genius Actions service
  - Vault services (EVM and Solana)
  - Lit Protocol integration services
- **Utils**: Utility functions for address handling, encoding, and chain operations

### 🦀 Genius Solana Contracts (`genius-contracts-solana/`)
**Total LOC**: 2,098

Rust-based Anchor smart contracts for Solana blockchain:

**Core Instructions**:
- `create_order.rs` - Order creation functionality
- `fill_order.rs` - Order fulfillment
- `revert_order.rs` - Order reversal
- `claim_fees.rs` - Fee claiming mechanism
- `fill_order_token_transfer.rs` - Token transfer for order filling
- `remove_bridge_liquidity.rs` - Liquidity management
- `set_target_chain_min_fee.rs` - Cross-chain fee configuration
- `initialize.rs` - Contract initialization
- And more administrative and operational instructions

## 🛡️ Security & Audits

This protocol has been professionally audited:

- **Hacken Audit** (January 27, 2025): `genius-contracts/audits/hacken-27-01-2025.pdf`
- **Halborn Audit** (December 2, 2024): `genius-contracts/audits/halborn-02-12-2024.pdf`

### Cantina Competition
- **Total Prize Pool**: $30,000 ($25,000 public + $5,000 dedicated researcher)
- **Competition Period**: July 3-24, 2025
- **Findings Submitted**: 390
- **Focus Area**: Lit Actions and system-wide security

## 🏗️ Key Features

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
- **gUSD Token**: "Genius USD" representing staked assets
- **Staking/Unstaking**: Deposit USDC to receive gUSD, redeem gUSD for USDC
- **Fee Collection**: Automated fee calculation and distribution

## 🚀 Build Instructions

### Genius EVM Contracts
```bash
cd genius-contracts
forge build --via-ir
```

**Deployment**:
```bash
forge script script/deployment/DeployOptimismGeniusEcosystem.s.sol --rpc-url $OPTIMISM_RPC_URL --broadcast --via-ir
```

### Genius Actions
```bash
cd genius-actions
npm run build:esbuild
```

### Genius Solana Contracts
```bash
cd genius-contracts-solana
anchor build
```

**Deployment**:
```bash
solana program deploy target/deploy/genius.so --program-id --with-compute-unit-price 500000 --max-sign-attempts 300 --use-rpc
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

- [Cantina Competition Details](https://cantina.xyz/competitions/12acc80c-4e4c-4081-a0a3-faa92150651a)
- [Code Walkthrough Video](https://youtu.be/1AVFPtIt334)
- [Lit Protocol Documentation](https://developer.litprotocol.com/sdk/serverless-signing/overview)
- [Official Website](https://app.bridgesmarter.com/)

## 📞 Contact

For issues or questions regarding this protocol, please reach out through the appropriate channels in the Cantina Discord or official Genius Foundation channels.
