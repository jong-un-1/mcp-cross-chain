/**
 * Converts amount between tokens with different decimals
 * @param amount The amount to convert
 * @param fromDecimals The decimals of the token to convert from
 * @param toDecimals The decimals of the token to convert to
 * @returns The converted amount
 * @throws Error if the amount is nonzero but conversion results in zero
 */
export default function convertDecimals(
  amount: bigint,
  fromDecimals: number,
  toDecimals: number,
): bigint {
  if (fromDecimals === toDecimals) {
    return amount;
  }
  if (fromDecimals < 0 || toDecimals < 0) {
    throw new Error('InvalidDecimals: Decimals cannot be negative');
  }

  let result: bigint;
  if (fromDecimals > toDecimals) {
    result = amount / BigInt(10 ** (fromDecimals - toDecimals));
  } else {
    result = amount * BigInt(10 ** (toDecimals - fromDecimals));
  }

  if (amount !== BigInt(0) && result === BigInt(0)) {
    throw new Error('InvalidAmount: Conversion resulted in zero');
  }

  return result;
}
