# ERC20 Shared Service

## Overview

The ERC20 Shared Service provides a unified interface for interacting with ERC20 tokens across multiple blockchain networks. It serves as a shared utility for all microservices that need to handle token operations.

## Features

- **Multi-chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism
- **Token Operations**: Balance queries, allowance checks, transfer preparation
- **Permit2 Integration**: Gas-less token approvals using Permit2 protocol
- **Token Management**: Metadata retrieval, caching, and database storage
- **Transaction Preparation**: Ready-to-send transaction data generation

## Architecture

```
ERC20Service
├── Token Information Management
├── Balance & Allowance Queries  
├── Permit2 Data Generation
├── Transaction Preparation
└── Multi-chain RPC Integration
```

## API Reference

### Core Methods

#### `getTokenInfo(tokenAddress: string, chainId: ChainId): Promise<Token | null>`
Retrieves token metadata including symbol, name, decimals, and logo.

**Example:**
```typescript
const token = await erc20Service.getTokenInfo(
  '0xA0b86a33E6C91B0576d8e2b1C2c8B8E10b2e4c1d', 
  ChainId.ETHEREUM
);
```

#### `getBalance(tokenAddress: string, walletAddress: string, chainId: ChainId): Promise<string>`
Gets the token balance for a specific wallet address.

**Example:**
```typescript
const balance = await erc20Service.getBalance(
  '0xA0b86a33E6C91B0576d8e2b1C2c8B8E10b2e4c1d',
  '0x1234...5678',
  ChainId.ETHEREUM
);
```

#### `getAllowance(tokenAddress: string, owner: string, spender: string, chainId: ChainId): Promise<string>`
Checks how much a spender is allowed to spend on behalf of the owner.

#### `generatePermit2Data(...): Promise<{domain, types, message, permit}>`
Generates Permit2 signature data for gas-less token approvals.

**Example:**
```typescript
const permit2Data = await erc20Service.generatePermit2Data(
  '0xA0b86a33E6C91B0576d8e2b1C2c8B8E10b2e4c1d', // token
  '0x1234...5678', // owner
  '0x9876...5432', // spender
  '1000000000000000000', // amount (1 token with 18 decimals)
  Math.floor(Date.now() / 1000) + 3600, // deadline (1 hour)
  ChainId.ETHEREUM
);
```

### Transaction Preparation

#### `prepareTransfer(tokenAddress: string, to: string, amount: string, chainId: ChainId)`
Prepares transaction data for ERC20 token transfer.

#### `prepareApprove(tokenAddress: string, spender: string, amount: string, chainId: ChainId)`
Prepares transaction data for ERC20 token approval.

### Token Management

#### `getSupportedTokens(chainId: ChainId, limit?: number, offset?: number): Promise<Token[]>`
Lists supported tokens for a specific chain.

#### `saveToken(token: Token): Promise<boolean>`
Adds or updates token information in the database.

## Integration Guide

### 1. Import the Service

```typescript
import { ERC20Service } from '../erc20';
```

### 2. Initialize in Your Service

```typescript
export class YourService extends BaseService {
  private erc20Service: ERC20Service;

  constructor(env: Env) {
    super(env);
    this.erc20Service = new ERC20Service(env);
  }

  protected async onInitialize(): Promise<void> {
    await this.erc20Service.initialize();
    // ... your initialization
  }
}
```

### 3. Use in Your Methods

```typescript
async function processTokenTransfer(tokenAddress: string, amount: string) {
  // Get token info
  const token = await this.erc20Service.getTokenInfo(tokenAddress, ChainId.ETHEREUM);
  if (!token) {
    throw new Error('Token not supported');
  }

  // Check balance
  const balance = await this.erc20Service.getBalance(tokenAddress, userAddress, ChainId.ETHEREUM);
  if (BigInt(balance) < BigInt(amount)) {
    throw new Error('Insufficient balance');
  }

  // Prepare transfer
  const txData = await this.erc20Service.prepareTransfer(tokenAddress, recipient, amount, ChainId.ETHEREUM);
  
  return txData;
}
```

## Supported Chains

| Chain | Chain ID | RPC URL Env Var |
|-------|----------|-----------------|
| Ethereum | 1 | `ETHEREUM_RPC_URL` |
| BSC | 56 | `BSC_RPC_URL` |
| Polygon | 137 | `POLYGON_RPC_URL` |
| Arbitrum | 42161 | `ARBITRUM_RPC_URL` |
| Optimism | 10 | `OPTIMISM_RPC_URL` |

## Permit2 Integration

The service includes full Permit2 protocol support:

- **Domain Separation**: Proper EIP-712 domain construction
- **Nonce Management**: Automatic nonce retrieval from Permit2 contracts
- **Type Definitions**: Standard Permit2 type structures
- **Multi-chain**: Permit2 support across all supported chains

### Permit2 Contract Addresses

Permit2 is deployed at `0x000000000022D473030F116dDEE9F6B43aC78BA3` on all supported chains.

## Caching Strategy

The service implements multiple caching layers:

1. **In-Memory Cache**: Token metadata and recent balances
2. **KV Store Cache**: Long-term token information 
3. **Database**: Permanent token registry

### Cache TTL

- Token metadata: 1 hour
- Token balances: 30 seconds
- Token allowances: No cache (always fresh)

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const token = await erc20Service.getTokenInfo(address, chainId);
} catch (error) {
  if (error.message.includes('Token not found')) {
    // Handle missing token
  } else if (error.message.includes('RPC error')) {
    // Handle RPC issues
  }
}
```

## Testing

Run the test suite:

```bash
npm run test src/services/erc20/
```

The service includes comprehensive unit tests covering:
- Token information retrieval
- Balance and allowance queries
- Permit2 data generation
- Transaction preparation
- Error scenarios
- Caching behavior

## Performance Considerations

- **RPC Optimization**: Batches multiple calls when possible
- **Intelligent Caching**: Reduces redundant blockchain queries
- **Connection Pooling**: Reuses RPC connections efficiently
- **Error Recovery**: Automatic retry with exponential backoff

## Security Features

- **Input Validation**: All addresses and amounts are validated
- **Permit2 Security**: Proper nonce and deadline handling
- **Rate Limiting**: Built-in protection against RPC abuse
- **Type Safety**: Full TypeScript coverage

## Contributing

When adding new features to the ERC20 service:

1. Add comprehensive tests
2. Update this documentation
3. Ensure multi-chain compatibility
4. Follow the existing error handling patterns
5. Update type definitions as needed

## Dependencies

- BaseService (core functionality)
- Core types (ChainId, Token, Env)
- Standard ERC20 ABI functions
- Permit2 protocol specifications