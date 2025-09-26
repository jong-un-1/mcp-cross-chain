import { ChainId } from '../../../types/chain-id';
import { RebalanceAction, VaultData } from '../rebalancing.types';

// Constants
const MIN_REBALANCING_AMOUNT = BigInt(1_000_000); // $1
const BASE_DECIMALS = 6;

// Types
interface NormalizedVault extends VaultData {
  normalizedVaultBalance: bigint;
  normalizedAvailableBalance: bigint;
  normalizedHighestStakedAmount: bigint;
  targetRatio: number;
}

// Main function
export const computeRebalancing = (
  vaultData: VaultData[],
  ratios?: number[],
): {
  actions: RebalanceAction[];
  finalAvailableBalances: Map<ChainId, string>;
} => {
  if (vaultData.length <= 1)
    return {
      actions: [],
      finalAvailableBalances: vaultDataToAvailableBalances(vaultData),
    };

  // Validate ratios if provided
  if (ratios) {
    if (ratios.length !== vaultData.length) {
      throw new Error('Number of ratios must match number of vaults');
    }
    if (
      Math.abs(ratios.reduce((sum, ratio) => sum + ratio, 0) - 1) > 0.000001
    ) {
      throw new Error('Ratios must sum to 1');
    }
  }

  // Use equal distribution if no ratios provided
  const defaultRatios = vaultData.map(() => 1 / vaultData.length);
  const normalizedVaults = normalizeVaults(vaultData, ratios || defaultRatios);
  const sortedVaults = sortVaultsByBalance(normalizedVaults);
  const totalBalance = calculateTotalBalance(sortedVaults);

  if (totalBalance === BigInt(0))
    return {
      actions: [],
      finalAvailableBalances: vaultDataToAvailableBalances(vaultData),
    };

  const actions = generateRebalancingActions(sortedVaults);

  return {
    actions,
    finalAvailableBalances: vaultDataToAvailableBalances(sortedVaults),
  };
};

// Balance calculation functions
function calculateTotalBalance(vaults: NormalizedVault[]): bigint {
  return vaults.reduce(
    (sum, vault) => sum + vault.normalizedAvailableBalance,
    BigInt(0),
  );
}

// Vault normalization functions
function normalizeVaults(
  vaults: VaultData[],
  ratios: number[],
): NormalizedVault[] {
  return vaults.map((vault, index) => ({
    ...vault,
    normalizedAvailableBalance: adjustForDecimals(
      vault.availableBalance,
      vault.decimals,
      BASE_DECIMALS,
    ),
    normalizedVaultBalance: adjustForDecimals(
      vault.vaultBalance,
      vault.decimals,
      BASE_DECIMALS,
    ),
    normalizedHighestStakedAmount: adjustForDecimals(
      vault.highestStakedAmount,
      vault.decimals,
      BASE_DECIMALS,
    ),
    targetRatio: ratios[index],
  }));
}

function sortVaultsByBalance(vaults: NormalizedVault[]): NormalizedVault[] {
  return [...vaults].sort((a, b) =>
    Number(b.normalizedAvailableBalance - a.normalizedAvailableBalance),
  );
}

// Rebalancing action generation
function generateRebalancingActions(
  sortedVaults: NormalizedVault[],
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  const totalBalance = calculateTotalBalance(sortedVaults);

  // Calculate target balances for each vault based on ratios
  const targetBalances = new Map<ChainId, bigint>();
  sortedVaults.forEach((vault) => {
    const targetBalance = BigInt(
      Math.floor(Number(totalBalance) * vault.targetRatio),
    );
    targetBalances.set(vault.network, targetBalance);
  });

  for (let i = 0; i < sortedVaults.length - 1; i++) {
    const sourceVault = sortedVaults[i];
    const sourceTarget = targetBalances.get(sourceVault.network)!;
    if (sourceVault.normalizedAvailableBalance <= sourceTarget) continue;

    processTargetVaults(
      sourceVault,
      sortedVaults.slice(i + 1),
      targetBalances,
      actions,
    );
  }

  return actions;
}

function processTargetVaults(
  sourceVault: NormalizedVault,
  targetVaults: NormalizedVault[],
  targetBalances: Map<ChainId, bigint>,
  actions: RebalanceAction[],
): void {
  for (const targetVault of targetVaults.reverse()) {
    const targetBalance = targetBalances.get(targetVault.network)!;
    if (targetVault.normalizedAvailableBalance >= targetBalance) continue;

    const rebalanceAmount = calculateRebalanceAmount(
      sourceVault,
      targetVault,
      targetBalances,
    );

    if (rebalanceAmount <= MIN_REBALANCING_AMOUNT) continue;

    updateVaultsAndCreateAction(
      sourceVault,
      targetVault,
      rebalanceAmount,
      actions,
    );
  }
}

function calculateRebalanceAmount(
  sourceVault: NormalizedVault,
  targetVault: NormalizedVault,
  targetBalances: Map<ChainId, bigint>,
): bigint {
  const sourceTarget = targetBalances.get(sourceVault.network)!;
  const targetTarget = targetBalances.get(targetVault.network)!;

  return min(
    sourceVault.normalizedAvailableBalance - sourceTarget,
    sourceVault.normalizedVaultBalance -
      sourceVault.normalizedHighestStakedAmount,
    targetTarget - targetVault.normalizedAvailableBalance,
  );
}

function updateVaultsAndCreateAction(
  sourceVault: NormalizedVault,
  targetVault: NormalizedVault,
  rebalanceAmount: bigint,
  actions: RebalanceAction[],
): void {
  const sourceAmount = adjustForDecimals(
    rebalanceAmount,
    BASE_DECIMALS,
    sourceVault.decimals,
  );
  const targetAmount = adjustForDecimals(
    rebalanceAmount,
    BASE_DECIMALS,
    targetVault.decimals,
  );

  const newSourceBalance = sourceVault.availableBalance - sourceAmount;
  const newTargetBalance = targetVault.availableBalance + targetAmount;

  actions.push({
    sourceNetwork: sourceVault.network,
    targetNetwork: targetVault.network,
    amount: sourceAmount.toString(),
  });

  sourceVault.availableBalance = newSourceBalance;
  sourceVault.vaultBalance -= sourceAmount;
  targetVault.availableBalance = newTargetBalance;
  targetVault.vaultBalance += targetAmount;

  // Update normalized balances
  sourceVault.normalizedAvailableBalance -= rebalanceAmount;
  sourceVault.normalizedVaultBalance -= rebalanceAmount;
  targetVault.normalizedAvailableBalance += rebalanceAmount;
  targetVault.normalizedVaultBalance += rebalanceAmount;
}

// Helper functions
export function adjustForDecimals(
  amount: bigint,
  fromDecimals: number,
  toDecimals: number,
): bigint {
  if (fromDecimals === toDecimals) return amount;

  if (fromDecimals > toDecimals) {
    const diff = fromDecimals - toDecimals;
    return amount / BigInt(10 ** diff);
  } else {
    const diff = toDecimals - fromDecimals;
    return amount * BigInt(10 ** diff);
  }
}

function min(...args: bigint[]): bigint {
  return args.reduce((min, curr) => (curr < min ? curr : min));
}

function vaultDataToAvailableBalances(
  vaultData: VaultData[],
): Map<ChainId, string> {
  return new Map(
    vaultData.map((vault: VaultData) => [
      vault.network,
      vault.availableBalance.toString(),
    ]),
  );
}
