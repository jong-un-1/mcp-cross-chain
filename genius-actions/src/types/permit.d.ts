export interface PermitDetails {
  token: string;
  amount: string;
  expiration: number;
  nonce: number;
}

export interface PermitSingle {
  // the permit data for a single token allowance
  details: PermitDetails;
  // address permissioned on the allowed tokens
  spender: string;
  // deadline on the permit signature
  sigDeadline: string;
}

export interface PermitBatch {
  details: PermitDetails[];
  spender: string;
  sigDeadline: string;
}

export interface PermitSignatureParams {
  types: PERMIT_BATCH_TYPES;
  domain: { name: string; chainId: number; verifyingContract: string };
  message: PermitBatch;
}
