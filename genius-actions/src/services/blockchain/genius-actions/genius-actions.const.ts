import { ActionTypeEnum } from './genius-actions.types';

// keccak256('SOLVER_IMPL_ACTION_ID')
export const SOLVER_IMPL_ACTION_ID_KEY =
  '0xdcae26801697a58a4bc38e2ed7773bec042dc29048e45faf3cc0a86fd8d65d69';

// keccak256('REBALANCER_IMPL_ACTION_ID')
export const REBALANCER_IMPL_ACTION_ID_KEY =
  '0x3f08655a88e8155620bcbdf0419d12632d7bbb2fe9a9b338889e919727222703';

export const getLitActionImplementationIdKey = (
  actionType: ActionTypeEnum,
): string => {
  switch (actionType) {
    case ActionTypeEnum.SOLVER:
      return SOLVER_IMPL_ACTION_ID_KEY;
    case ActionTypeEnum.REBALANCER:
      return REBALANCER_IMPL_ACTION_ID_KEY;
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};
