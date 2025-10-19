import {
  publicKeyToHex,
  uint8ArrayToStr,
} from '../../../utils/string-to-bytes32';

/**
 * Validate a field between decoded and passed order
 * @param decodedValue The value from the decoded order
 * @param passedValue The value from the passed order
 * @param fieldName The field name for error reporting
 */
export const validateField = (
  decodedValue: string,
  passedValue: string,
  fieldName: string,
): void => {
  if (decodedValue !== passedValue) {
    console.log(
      `Order ${fieldName} mismatch, decoded ${fieldName}: ${decodedValue}, passed ${fieldName}: ${passedValue}`,
    );
    throw new Error(`Order ${fieldName} mismatch`);
  }
};

/**
 * Check Solana-specific order parameters
 * @param decodedOrder The decoded order from the blockchain
 * @param order The order from the request
 */
export const validateSolanaOrder = (decodedOrder: any, order: any): void => {
  validateField(decodedOrder.amountIn.toString(), order.amountIn, 'amountIn');
  validateField(decodedOrder.fee.toString(), order.fee, 'fee');
  validateField(decodedOrder.minAmountOut, order.minAmountOut, 'minAmountOut');
  validateField(
    publicKeyToHex(uint8ArrayToStr(decodedOrder.trader, false)),
    order.trader,
    'trader',
  );
  validateField(
    uint8ArrayToStr(decodedOrder.receiver, true),
    order.receiver,
    'receiver',
  );
  validateField(
    publicKeyToHex(uint8ArrayToStr(decodedOrder.tokenIn, false)),
    order.tokenIn,
    'tokenIn',
  );
  validateField(
    uint8ArrayToStr(decodedOrder.tokenOut, true),
    order.tokenOut,
    'tokenOut',
  );
  validateField(
    decodedOrder.srcChainId.toString(),
    order.srcChainId,
    'srcChainId',
  );
  validateField(
    decodedOrder.destChainId.toString(),
    order.destChainId,
    'destChainId',
  );
};
