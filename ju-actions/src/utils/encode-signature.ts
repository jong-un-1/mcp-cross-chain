import { ethers } from 'ethers';

export const encodeSignature = (signature: string | object) => {
  const jsonSignature =
    typeof signature === 'string' ? JSON.parse(signature) : signature;
  jsonSignature.r = '0x' + jsonSignature.r.substring(2);
  jsonSignature.s = '0x' + jsonSignature.s;
  return ethers.utils.joinSignature(jsonSignature);
};
