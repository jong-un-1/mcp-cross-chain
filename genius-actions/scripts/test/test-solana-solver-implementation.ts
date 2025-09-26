import { config } from 'dotenv';
import { Order } from '../../src/services/blockchain/vault/vault.types';
import getLitAction from '../utils/get-lit-action';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { getLitNodeClient } from '../utils/lit-client';
import { AccessControlConditions } from '@lit-protocol/types';
import { ENVIRONMENT } from '../../src/types/environment';
import { publicKeyToHex } from '../../src/utils/string-to-bytes32';
import { Connection } from '@solana/web3.js';
import { JitoService } from '../../src/utils/solana/jito';

config();

const order: Order = {
  seed: '0xaaecc774d3f8e013420778c677b0d2863fb58bf7d960965368e0b82d9d6d1f7f',
  trader: '0x000000000000000000000000b0e62f5c874b7edea2e977567c283aae140bba7e',
  receiver:
    '0x27b868986b8746d0a1a2127dc49aa6c9abe115483117e45f84361e1b717f4c40',
  tokenIn: '0x000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
  tokenOut:
    '0xc6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d61',
  amountIn: '30000',
  minAmountOut: '1',
  srcChainId: '8453',
  destChainId: '1399811149',
  fee: '10',
};

async function getUnfilledOrders(): Promise<Order[]> {
  // const tokenOut = 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump';
  // const tokenOut = 'AxriehR6Xw3adzHopnvMn7GcpRFcD41ddpiTWMg6pump';
  // const tokenOut = '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN';
  // const tokenOut = 'Gwy5Jxf1q33WYkJYq77Ju8gSa3HPekGiZsLHQTnJpump';
  // const tokenOut = 'EfgEGG9PxLhyk1wqtqgGnwgfVC7JYic3vC9BCWLvpump';
  // const tokenOut = 'EkTBTacd2PWFQEgLpxZ6MJvuoJPxcm7gb2bwKzzqpump';
  // const tokenOut = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const tokenOut = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const tokenOutHex = publicKeyToHex(tokenOut);
  const or = order;
  or.tokenOut = tokenOutHex;

  const orders: Order[] = [or];

  return orders;
}

async function processUnfilledOrders() {
  try {
    const orders = await getUnfilledOrders();

    console.log('found orders=>', orders.length);
    const litNodeClient = await getLitNodeClient('datil-dev', true);

    const actionFile = getLitAction('SOLVER_IMPLENTATION');
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
    };

    console.log('envVars=>', envVars);

    const startTime = new Date().getTime();
    const output = await litNodeClient.executeJs({
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        env: ENVIRONMENT.DEV,
        orders,
        arbitraryCalls: orders.map(() => null),
        swapsCalls: orders.map(() => null),
        evmPkpAddress: pkps[0].ethAddress,
        evmPkpPublicKey: pkps[0].publicKey,
        orchestratorSolanaPubKey:
          'D2MC6Q38rJurBLC9V5uYPAckrv1S7d3PaLLhQHWV9Sgq',
        accessControl,
        envVars,
      },
    });

    // const output = await fillOrders(
    //   ENVIRONMENT.STAGING,
    //   orders,
    //   orders.map(() => null),
    //   orders.map(() => null),
    // );

    console.log('time for signing=>', new Date().getTime() - startTime);
    // console.log('output=>', JSON.stringify(output));
    const txnsToExecute = parseTransactionsToExecute(JSON.stringify(output));
    // console.log('txnsToExecute', txnsToExecute);
    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    );

    const jitoService = new JitoService(envVars);
    const simRes = await jitoService.simulateTransactions(
      txnsToExecute,
      connection,
    );
    console.log('simRes', simRes);
  } catch (error) {
    console.error('Error in processing unfilled orders:', error);
  }
}

interface TransactionData {
  chainId: number;
  transaction: {
    txnsToExecute: string[];
    fallbackTxn: string;
  }[];
}

function parseTransactionsToExecute(jsonData: string): string[] {
  try {
    // Parse the JSON data
    const data = JSON.parse(jsonData);

    // Check if the expected response structure exists
    if (data.response) {
      // Parse the response string as JSON
      const responseData = JSON.parse(data.response) as TransactionData[];

      // Extract txnsToExecute from the first transaction entry
      if (
        responseData.length > 0 &&
        responseData[0].transaction &&
        responseData[0].transaction.length > 0
      ) {
        return responseData[0].transaction[0].txnsToExecute;
      }
    }

    return [];
  } catch (error) {
    console.error('Error parsing transactions:', error);
    return [];
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
