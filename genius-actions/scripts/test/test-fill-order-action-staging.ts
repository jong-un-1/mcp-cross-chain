import { config } from 'dotenv';
import { Client } from 'pg';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { getLitNodeClient } from '../utils/lit-client';
import { AccessControlConditions } from '@lit-protocol/types';
import { encryptString } from '../utils/encrypt-string';
import { Order } from '../../src/services/blockchain/vault/vault.types';

config();

const dbConfig = {
  host: process.env.POSTGRES_HOST_STAGING || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT_STAGING || '6543'),
  user: process.env.POSTGRES_USER_STAGING || 'postgres',
  password: process.env.POSTGRES_PASSWORD_STAGING || 'postgres',
  database: process.env.POSTGRES_DATABASE_STAGING || 'genius_bridge',
};

const evmOrchestratorsStaging = [
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x039dA65e692cb4dd93d6DE2ca6A15268F9cF6Fb6',
    pkpPublicKey:
      '0x042f28bb8be1506edb02c2b3bbe66cca7769fe624bb4bfb6bcf99181c4c27db681ced0839539a05c1053451af62ec94350f92154d9013df9062e6deaeb21b49c21',
  },
  {
    ipfsHash: 'QmV2hGnMJurLdJb5TT6s62GvT2FvJmsco6TejPBxCbAG1o',
    address: '0x924dEF89eAB8bf12fC0065253D1bC89D1AcEAdc6',
    pkpPublicKey:
      '0x047e104c20bd478c25b42f87159c2275c07b819358e29bac313f94002daf926158075c5694f2f5fc6aef86c13f587a5183972b4d759ba6837b851422610bac6cdb',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x479417C01FA532632655579814607E94e6B27550',
    pkpPublicKey:
      '0x04f1025e63d948d09ab23974cf23b220622e9805d5533b2771683cd6de886ae06a1a51aa48fcd800f011f0d9e0fe53d75b7356eaf43497b70ad1bb5679b5f1ec1a',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x06247B5d327Aa90Fd84bf909C61eC8Eea65961C3',
    pkpPublicKey:
      '0x04cc8d21799e6cee8da1e296666c7c005c6a3972faf921b19ba92e10703cc84aead3ca4bb04db21a2313cb47c4b7ec4e98cfeef2f111b53930f5553133dd7b3b78',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x30641364A0613443381d1DC64D3337A02dc01FAA',
    pkpPublicKey:
      '0x047968893229467d26f010fe45670c241f5072e84de7bc27142aec0e603cf67e392abbdc399868f211715e6c812d426af7a864bc254788993b0007412cf128207b',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x1283Ba98C0Dae54d7A49Bd8c77cbC0Be8b65D223',
    pkpPublicKey:
      '0x045f4cd0270556b75ed9aecbb746fb5032c4ab99c5914ef3fb2aa6bef2e8629164d464c5faf6a5cd516cedc4d38f0e4d3064ac0b97ffc54c55c095020394bb10e5',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x9473c973c33E3924017FeF02C9E407907f6E8530',
    pkpPublicKey:
      '0x04095d834bffe957ab0319d2e99ac32ba3b1e1188a27c2402f0f7429c6e55eb5f96ea8d5dc04aa3e562e9917beba23beecf99d7d1238a40ab9c399ddda509db237',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0xBcd7efa8235F85A349EBE79Bf107a6E794435a4D',
    pkpPublicKey:
      '0x04a108770eb6dcb57b2ce19ba28f30011b35fa4519d6b6b484bec01df7e364d30409141e13cab00733d89bc87ed25613a9f9ee2bc159f2fa0d3f36c3dc3d71794b',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0x74C440B89A00087E77364b26CFa5640714dCfA4f',
    pkpPublicKey:
      '0x04d156806139619a2d59b26dcda91b33eeef4ed2590404cd1b8cadf2276f380a4eb8676f3098ba05b2872366c1f7852c85323b693c0b0c25c71dd5038d09475341',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0xc241Ef90fc2e24e897900bc5e6E487e1CE6C9071',
    pkpPublicKey:
      '0x0458d0c75b3f3ae26c0813ad1edc856b7c9040c7b21c2c0eb381ec4d378f596d589fd7b51390bef60c7ae7e696537618ff13268b0a4aea8e128873aad93aebf32c',
  },
  {
    ipfsHash: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
    address: '0xd76f6b71b7Cea442834E6E40619C9dfF260C7148',
    pkpPublicKey:
      '0x04adf501c005deb403c8b8e2195fb718e456ae3403803c19b4819553a4df65d7d0060342a2e7c711cb5331be3eddce470d5c3375bd182093d9d79ad54e3061ad50',
  },
];

async function getUnfilledOrders(): Promise<Order[]> {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT * FROM ordercreated_event 
      WHERE flag IS NULL LIMIT 5;
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

    // const actionFile = getLitAction('SOLVER_DEV');
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
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      // QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      // QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      // QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      // QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      // QUICKNODE_AVALANCHE_KEY: process.env.QUICKNODE_AVALANCHE_KEY,
    };

    const orchestratorSolana = await encryptString(
      process.env.ORCHESTRATOR_PK_SOLANA as string,
      accessControl,
      litNodeClient,
    );

    console.log('envVars=>', envVars);

    const startTime = new Date().getTime();

    const promises = orders.map((order, index) =>
      litNodeClient.executeJs({
        ipfsId: 'Qmec9kGAnNmK8mQTaXJrJ3PpBQXPjjH9gqocnYvJNiGcUW',
        sessionSigs: sessionSigs,
        jsParams: {
          orders: [order],
          arbitraryCalls: orders.map(() => null),
          swapsCalls: orders.map(() => null),
          evmPkpAddress: evmOrchestratorsStaging[index].address,
          evmPkpPublicKey: evmOrchestratorsStaging[index].pkpPublicKey,
          orchestratorSolana,
          accessControl,
          envVars: envVars,
        },
      }),
    );

    const res = await Promise.all(promises);

    console.log('time for signing=>', new Date().getTime() - startTime);
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
