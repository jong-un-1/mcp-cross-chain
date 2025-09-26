import { config } from 'dotenv';
import { Client } from 'pg';
import { Order } from '../../src/services/blockchain/vault/vault.types';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { getLitNodeClient } from '../utils/lit-client';
import { AccessControlConditions } from '@lit-protocol/types';
import { encryptString } from '../utils/encrypt-string';
import getLitAction from '../utils/get-lit-action';
import { ENVIRONMENT } from '../../src/types/environment';

config();

const dbConfig = {
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DATABASE || 'genius_bridge',
};

async function getUnfilledOrders(): Promise<Order[]> {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT * FROM ordercreated_event 
      WHERE flag IS NULL LIMIT 2;
    `;

    const result = await client.query(query);

    // Map database results to Order type
    const orders: Order[] = result.rows.map((row) => ({
      seed: row.seed,
      trader: row.trader,
      receiver: row.receiver,
      tokenIn: row.tokenIn,
      tokenOut: row.tokenOut,
      amountIn: row.amountIn.toString(),
      minAmountOut: row.minAmountOut.toString(),
      srcChainId: row.chainId.toString(),
      destChainId: row.destChainId.toString(),
      fee: row.fee.toString(),
    }));

    console.log('Unfilled orders:', orders.length);

    return orders;
  } catch (error) {
    console.error('Error fetching unfilled orders:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function processUnfilledOrders() {
  try {
    const orders = await getUnfilledOrders();

    console.log('found orders=>', orders);
    const litNodeClient = await getLitNodeClient('datil-dev', true);

    const actionFile = getLitAction('SOLVER_TEST');
    const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-dev');

    console.log(
      'pkps=>',
      pkps.map((pkp) => pkp),
    );

    const accessControl: AccessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '0',
        },
      },
    ];

    const envVars = {
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      QUICKNODE_AVALANCHE_KEY: process.env.QUICKNODE_AVALANCHE_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      QUICKNODE_JITO_KEY: process.env.QUICKNODE_JITO_KEY,
      QUICKNODE_JITO_ENDPOINT: process.env.QUICKNODE_JITO_ENDPOINT,
      QUICKNODE_BASE_ENDPOINT: process.env.QUICKNODE_BASE_ENDPOINT,
      QUICKNODE_OPTIMISM_ENDPOINT: process.env.QUICKNODE_OPTIMISM_ENDPOINT,
      QUICKNODE_ARBITRUM_ENDPOINT: process.env.QUICKNODE_ARBITRUM_ENDPOINT,
      QUICKNODE_BSC_ENDPOINT: process.env.QUICKNODE_BSC_ENDPOINT,
      QUICKNODE_AVALANCHE_ENDPOINT: process.env.QUICKNODE_AVALANCHE_ENDPOINT,
      QUICKNODE_POLYGON_ENDPOINT: process.env.QUICKNODE_POLYGON_ENDPOINT,
    };

    const orchestratorSolana = await encryptString(
      process.env.ORCHESTRATOR_PK_SOLANA as string,
      accessControl,
      litNodeClient,
    );

    console.log('envVars=>', envVars);

    const implementationIdTest =
      'QmWUMzNmxvbrZHMbPKnrPGNYGpLin1QJQfaCzNo5hgRoJ1';

    const startTime = new Date().getTime();
    const output = await litNodeClient.executeJs({
      // ipfsId: 'QmXdZ3AEBPeBMTjBjw53M54uFzSUHQJjeqPkz6FbBsEq2p',
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        implementationIdTest,
        orders,
        arbitraryCalls: orders.map(() => null),
        swapsCalls: orders.map(() => null),
        evmPkpAddress: pkps[0].ethAddress,
        evmPkpPublicKey: pkps[0].publicKey,
        orchestratorSolana,
        accessControl,
        envVars,
        env: ENVIRONMENT.DEV,
      },
    });

    console.log('time for signing=>', new Date().getTime() - startTime);
    console.log('output=>', JSON.stringify(output));
  } catch (error) {
    console.error('Error in processing unfilled orders:', error);
  }
}

// Execute the script
processUnfilledOrders()
  .then(() => {
    console.log('Script completed');
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
