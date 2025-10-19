import { config } from 'dotenv';
import { Client } from 'pg';
import { Order } from '../../src/services/blockchain/vault/vault.types';
import getLitAction from '../utils/get-lit-action';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { getLitNodeClient } from '../utils/lit-client';
import { AccessControlConditions } from '@lit-protocol/types';
import { ENVIRONMENT } from '../../src/types/environment';

config();

const dbConfig = {
  host: process.env.POSTGRES_HOST_STAGING || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT_STAGING || '6543'),
  user: process.env.POSTGRES_USER_STAGING || 'postgres',
  password: process.env.POSTGRES_PASSWORD_STAGING || 'postgres',
  database: process.env.POSTGRES_DATABASE_STAGING || 'genius_bridge',
};

async function getUnfilledOrders(): Promise<Order[]> {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT * FROM ordercreated_event 
      WHERE flag IS NULL LIMIT 6 OFFSET 3;
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

    console.log('found orders=>', orders.length);
    const litNodeClient = await getLitNodeClient('datil-test', true);

    const actionFile = getLitAction('SOLVER_IMPLENTATION');
    const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-test');

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
      // QUICKNODE_AVALANCHE_KEY: process.env.QUICKNODE_AVALANCHE_KEY,
    };

    console.log('envVars=>', envVars);

    const startTime = new Date().getTime();

    const promises = orders.map((order) =>
      litNodeClient.executeJs({
        code: actionFile,
        sessionSigs: sessionSigs,
        jsParams: {
          env: ENVIRONMENT.STAGING,
          orders,
          arbitraryCalls: [order],
          swapsCalls: orders.map(() => null),
          evmPkpAddress: pkps[0].ethAddress,
          evmPkpPublicKey: pkps[0].publicKey,
          orchestratorSolanaPubKey: 'hdehde',
          accessControl,
          envVars: envVars,
        },
      }),
    );

    const res = await Promise.all(promises);

    // const output = await fillOrders(
    //   ENVIRONMENT.STAGING,
    //   orders,
    //   orders.map(() => null),
    //   orders.map(() => null),
    // );

    console.log('time execution=>', new Date().getTime() - startTime);
    console.log('output=>', JSON.stringify(res));
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
