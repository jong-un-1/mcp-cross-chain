import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

export const getWalletAuthSig = async (wallet: ethers.Wallet | string) => {
  if (typeof wallet === 'string') {
    wallet = new ethers.Wallet(wallet);
  }
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const origin = 'https://tradegenius.com';
  const message = `Generate a server auth signature for ${wallet.address} at ${now}`;
  const statement = message;
  const expirationTime = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const siweMessage = new SiweMessage({
    domain: 'node',
    address: wallet.address,
    uri: origin,
    statement,
    version: '1',
    chainId: 1,
    expirationTime,
  });

  const messageToSign = siweMessage.prepareMessage();

  const signature = await wallet.signMessage(messageToSign);

  const recoveredAddress = ethers.utils.verifyMessage(messageToSign, signature);

  const authSig = {
    sig: signature,
    derivedVia: 'web3.eth.personal.sign',
    signedMessage: messageToSign,
    address: recoveredAddress,
  };

  return authSig;
};
