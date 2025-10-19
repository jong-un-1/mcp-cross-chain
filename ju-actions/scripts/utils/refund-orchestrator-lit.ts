import { config } from 'dotenv';
import { ExecutionHandler } from '../../src/services/lit-services/execution-handler/execution-handler';
import { ChainId } from '../../src/types/chain-id';
import { getLitNodeClient } from './lit-client';
import { getExecutorSessionSigs } from './lit-auth';
import { ENVIRONMENT } from '../../src/types/environment';

config();

export const refundOrchestrator = async (
  actionId: string,
  orchestrators: {
    pkpPublicKey: string;
    address: string;
  }[],
  chains: ChainId[],
) => {
  const litNodeClient = await getLitNodeClient('datil-test', true);
  const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-test');

  console.log('pkps=>', pkps);

  const promises: Promise<any>[] = [];

  for (const orchestrator of orchestrators) {
    const ownerExecutor = new ExecutionHandler(process.env.OWNER_PK || '');
    const ownerSig = await ownerExecutor.signEvm(
      `REFUND_ORCHESTRATOR_${orchestrator.address}`,
    );

    promises.push(
      ...chains.map((chain) =>
        litNodeClient.executeJs({
          ipfsId: actionId,
          sessionSigs: sessionSigs,
          jsParams: {
            chainId: chain,
            orchestratorAddress: orchestrator.address,
            evmPkpPublicKey: orchestrator.pkpPublicKey,
            ownerSignature: ownerSig,
            env: ENVIRONMENT.STAGING,
            gasPrice: null,
            gasLimit: null,
          },
        }),
      ),
    );
  }

  const output = await Promise.all(promises);

  console.log(output);
};

refundOrchestrator(
  'QmTd6RdY9kJaADqAX7DfVFMq8YNgnVkGd7t9Tw6YiZaxRA',
  [
    {
      address: '0xB0E6239766065091399Bd93b58d000D6Ad7Fa837',
      pkpPublicKey:
        '0x04924a05c410d26787d6f9298048884c5a3b8e48b1f998678f7be4cb2b98df727686c98bb858ef65dc2d25d75df05e12981879a85796279499517246834cbd6392',
    },
    {
      address: '0x307E192C8A7459717D6987D4981826F3eaf74Ce0',
      pkpPublicKey:
        '0x0436f5fea506855271a90be73aa23d447b6e2ea19efd34d1a9ddbff81ada6c29e26420253460137a2a3870b36fe62733b860a4986c928c21cfc074a5cab959eeab',
    },
    {
      address: '0x0195461A8b3D35812D411A6E64b3947B4cb3c97d',
      pkpPublicKey:
        '0x041aebc1b95a78dc5ef4a95c88424e413d60c360e83c33f0ecad3c5f50cd9ea1348b3caf29fcd93669b17adfbc909ad8489141d630ccbacf4df24c665f04b7f2ff',
    },
    {
      address: '0xD718f297b35D3428c001b3d6Cfd5cE160E333f10',
      pkpPublicKey:
        '0x04070f73dbf97a0f4a06367b221f022339df0fb314f91396c4f49c2b212904b917a74cc8dbef1f4ae1aa348d64c8317632129407974e5f22bace97925565e4fdc1',
    },
    {
      address: '0x14c2D140eCBaf83F36E3AB528EDFF192f4Db5e73',
      pkpPublicKey:
        '0x04587a5cb5c3d0d486e03193dee51d851cde4c47035595e7783dae53f6d0547f42155f7eb7d7e1323784c0e3bec803fa6dc3fe8c7ad2d2aa899b9549d75ec0b689',
    },
    {
      address: '0xB8955f6a57a6CA5D06f27de426cC14b1A1039801',
      pkpPublicKey:
        '0x04ff137453a4d5ad13e6e736353a2ff53d6280232b2d21a753692ef62c8c82d0c5d423f846d1b0145a9a96fa436c4d8d8a386c8d8ee2b2b0bb7397b1aaa4baa050',
    },
    {
      address: '0xF2082a1933752682B892f44Dd7de1efe0387C2E3',
      pkpPublicKey:
        '0x043059f8d5e991c28527e80e504c59b52d65733a4708ec4e82b826bca08628999298ec930c2540109914af83ddf1bc0b7ee7ac774bd4eafb0fe1c912bc8af3b09b',
    },
    {
      address: '0x1e6F78d9928d4B0d47F1942D2212BC3381e705E1',
      pkpPublicKey:
        '0x047c8e0bbb86a92e752b47038bd708995fcec87a634e639a1fdeb1d3d24b816f8e0cca12e6f78ad41b0999fe5d7b481333902426ca0db3c1e781242f9975aa12af',
    },
    {
      address: '0x51F8fB15Cc808a63CC45592991103edBbaB613df',
      pkpPublicKey:
        '0x044f711b66ec76ff2682595a0ab58922115d8afc7efa7f0d43bc696a70874caa5e033233f99ca40c1fe3f71e7a27f753d95ebb50df21f792b3c945053b05c23d04',
    },
    {
      address: '0x5B9DDA96579C9D88140457a4a7e3A30cBAb60c27',
      pkpPublicKey:
        '0x04d9a1a51160ad387781a5e3964834020d0983f21c77a524b41da30d4d964f78945fd468f7c3f7d3518c02539d6b345f1e6c428e4a764f6da3dbb1af1d0001fb38',
    },
    {
      address: '0x65A2125D366714B1B92089cd6e9BDBD6FC6d7cC5',
      pkpPublicKey:
        '0x04e49470472cd4f3fe08e25ec70390cbd87324522da4ec02caaf305f1a9cf710c416a9c57eb3c53ddd3d93d62303b6748732b1e9150f1027491f57a7836c4244ae',
    },
  ],
  [
    ChainId.ETHEREUM,
    ChainId.SONIC,
    ChainId.OPTIMISM,
    ChainId.ARBITRUM,
    ChainId.AVALANCHE,
    ChainId.BASE,
    ChainId.BSC,
    ChainId.POLYGON,
  ],
);
