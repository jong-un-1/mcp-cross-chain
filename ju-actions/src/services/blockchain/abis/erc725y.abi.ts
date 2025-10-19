export const erc725yAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'initialOwner', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getData',
    inputs: [{ name: 'dataKey', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: 'dataValue', type: 'bytes', internalType: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDataBatch',
    inputs: [
      { name: 'dataKeys', type: 'bytes32[]', internalType: 'bytes32[]' },
    ],
    outputs: [{ name: 'dataValues', type: 'bytes[]', internalType: 'bytes[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setData',
    inputs: [
      { name: 'dataKey', type: 'bytes32', internalType: 'bytes32' },
      { name: 'dataValue', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'setDataBatch',
    inputs: [
      { name: 'dataKeys', type: 'bytes32[]', internalType: 'bytes32[]' },
      { name: 'dataValues', type: 'bytes[]', internalType: 'bytes[]' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4', internalType: 'bytes4' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'DataChanged',
    inputs: [
      {
        name: 'dataKey',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'dataValue',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'ERC725Y_DataKeysValuesEmptyArray', inputs: [] },
  { type: 'error', name: 'ERC725Y_DataKeysValuesLengthMismatch', inputs: [] },
  { type: 'error', name: 'ERC725Y_MsgValueDisallowed', inputs: [] },
  { type: 'error', name: 'OwnableCannotSetZeroAddressAsOwner', inputs: [] },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
];
