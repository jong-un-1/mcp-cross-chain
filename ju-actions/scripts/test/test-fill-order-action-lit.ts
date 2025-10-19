import { AccessControlConditions } from '@lit-protocol/types';
import { config } from 'dotenv';
import { getLitNodeClient } from '../utils/lit-client';
import { Order } from '../../src/services/blockchain/vault/vault.types';
import { ENVIRONMENT } from '../../src/types/environment';
import { EvmArbitraryCall } from '../../src/types/evm-arbitrary-call';

import getLitAction from '../utils/get-lit-action';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { encryptString } from '../utils/encrypt-string';

config();

const testFillOrderAction = async (order: Order) => {
  try {
    const litNodeClient = await getLitNodeClient('datil-test', true);
    // const receiver = bytes32ToAddress(order.receiver);
    // const tokenOut = bytes32ToAddress(order.tokenOut);
    // const calldata = new ethers.utils.Interface([
    //   'function depositAvailableBalance(address asset, address onBehalfOf) external returns (uint256)',
    // ]).encodeFunctionData('depositAvailableBalance', [tokenOut, receiver]);
    // const callTarget = '0x4C583B944EDa6364147Ce5b953315869C81aF3e6';
    // const arbitraryCall: EvmArbitraryCall = {
    //     data: calldata,
    //     to: callTarget,
    //     value: '0',
    // };
    const arbitraryCall = null;

    const actionFile = getLitAction('SOLVER_DEV');
    const { sessionSigs } = await getExecutorSessionSigs('datil-test');

    const orchestratorAccess: AccessControlConditions = [
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

    console.log('orchestratorAccess=>', orchestratorAccess);
    console.log('process.env.ORCHESTRATOR_PK=>', process.env.ORCHESTRATOR_PK);

    const orchestrator = await encryptString(
      process.env.ORCHESTRATOR_PK || '',
      orchestratorAccess,
      litNodeClient,
    );

    console.log(orchestrator);

    const swapCall: EvmArbitraryCall | null = null;

    // if (order.tokenOut.toLowerCase() !== STABLECOIN_ADR(Number(order.destChainId)).toLowerCase()) {
    //     const geniusApiService = new GeniusApiService(ENVIRONMENT.TEST);
    //     const proxyCallOut = GENIUS_PROXY_CALL_ADR(Number(order.destChainId), ENVIRONMENT.STAGING);
    //     const price = await geniusApiService.getAggregatorsPrice({
    //         from: proxyCallOut,
    //         amountIn: (BigInt(order.amountIn) - BigInt(order.fee)).toString(),
    //         tokenIn: STABLECOIN_ADR(Number(order.destChainId)),
    //         tokenOut: tokenOut,
    //         network: Number(order.destChainId),
    //         // TODO: calculate slippage with tokenOut price and minAmountOut
    //         slippage: 1,
    //     });
    //     const quote = await geniusApiService.getAggregatorsQuote({
    //         from: proxyCallOut,
    //         to: arbitraryCall ? proxyCallOut : receiver,
    //         priceResponse: price.response,
    //     });

    //     swapCall = {...quote.executionPayload[quote.executionPayload.length - 1], value: '0'};
    // }

    console.log('swapCall=>', swapCall);

    const startTime = new Date().getTime();
    const output = await litNodeClient.executeJs({
      // ipfsId: 'QmPq6sbUgydKw9mwXXmxkgNSBubSRvW3rdm9GCQSLLT6yC',
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        env: ENVIRONMENT.STAGING,
        order,
        arbitraryCall,
        swapCall,
        orchestrator,
        orchestratorAccess,
      },
    });

    console.log('time for signing=>', new Date().getTime() - startTime);
    console.log('output=>', output);
  } catch (e) {
    console.log('error in fill order=>', e);
  }
};

const order: Order = {
  seed: '0x53fdc2b3d149b2766764ed2e0f9fbb16dd210811dc887e604c66d8392f421c31',
  trader: '0x000000000000000000000000b0e62f5c874b7edea2e977567c283aae140bba7e',
  receiver:
    '0x000000000000000000000000b0e62f5c874b7edea2e977567c283aae140bba7e',
  tokenIn: '0x000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
  tokenOut:
    '0x0000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c31607',
  amountIn: '1000000',
  minAmountOut: '810000',
  srcChainId: '8453',
  destChainId: '10',
  fee: '100000',
};

testFillOrderAction(order);
