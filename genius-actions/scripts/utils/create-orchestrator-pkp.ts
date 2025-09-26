import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import bs58 from 'bs58';
import { getPkpInfoFromMintReceipt } from './get-pkp-info-from-receipt';
import { ethers, Wallet } from 'ethers';
import { config } from 'dotenv';

config();

export const createOrchestrationPKP = async (
  actionHashes: string[],
  numberOfPKPs: number = 1,
): Promise<string[]> => {
  console.log(
    `Creating ${numberOfPKPs} PKPs with the following action hashes:`,
    actionHashes,
  );
  const litContracts = new LitContracts({
    signer: new Wallet(
      process.env.EXECUTOR_PK || '',
      new ethers.providers.StaticJsonRpcProvider(process.env.LIT_RPC_URL),
    ),
    network: 'datil-test',
  });
  await litContracts.connect();

  const pkpMintCost = await litContracts.pkpNftContract.read.mintCost();

  const addresses: string[] = [];

  for (let i = 0; i < numberOfPKPs; i++) {
    const tx =
      await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
        AUTH_METHOD_TYPE.LitAction, // keyType
        actionHashes.map(() => AUTH_METHOD_TYPE.LitAction),
        actionHashes.map(
          (actionHash) =>
            `0x${Buffer.from(bs58.decode(actionHash)).toString('hex')}`,
        ), // permittedAuthMethodIds
        actionHashes.map(() => '0x'), // permittedAuthMethodPubkeys
        // permittedAuthMethodScopes
        actionHashes.map(() => [[AUTH_METHOD_SCOPE.SignAnything]]),
        // addPkpEthAddressAsPermittedAddress
        // This allows the PKP to update it's own Lit Auth Method,
        // or transfer ownership of the PKP to another address
        true,
        // sendPkpToItself
        // This means the PKP ETH address is the owner of the PKP NFT
        true,
        // mintCost
        { value: pkpMintCost },
      );

    const receipt = await tx.wait();

    const pkpInfo = await getPkpInfoFromMintReceipt(receipt, litContracts);
    console.log(`PKP ${i + 1} minted!`);
    console.log(`ℹ️ PKP Public Key: ${pkpInfo.publicKey}`);
    console.log(`ℹ️ PKP Token ID: ${pkpInfo.tokenId}`);
    console.log(`ℹ️ PKP ETH Address: ${pkpInfo.ethAddress}`);
    console.log(`\n\n`);

    if (pkpInfo.ethAddress) addresses.push(pkpInfo.ethAddress);
  }

  return addresses;
};

createOrchestrationPKP(
  [
    'QmbHWPULpEA5Mk2AuBZD8nwsiDffL7XBTfYpfTuPbjpd4C',
    'QmUi9iYUnZCTRjVL7Rw7kRyPZ6ubJAYxSmrfP53s3mdSAf', // Refund orchestrator
  ],
  1,
).then(console.log);
