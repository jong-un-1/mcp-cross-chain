import axios from 'axios';

export enum PrioritizationLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

interface IPreparePriorizationFees {
  transaction?: string;
  priorityLevel?: string;
}

/**
 * Fetches the priorization fees for the quoting engine.
 *
 * @param {IPreparePriorizationFees} options - The options for fetching priorization fees.
 * @param {IClient} options.client - The client used for fetching priorization fees.
 * @returns {Promise<number>} The priorization fee with buffer.
 */
export async function fetchPriorizationFees({
  transaction,
  priorityLevel,
}: IPreparePriorizationFees): Promise<number> {
  let request;
  if (transaction) {
    request = {
      jsonrpc: '2.0',
      id: 'helius-priority-fee-request',
      method: 'getPriorityFeeEstimate',
      params: [
        {
          transaction,
          options: {
            recommended: true,
            transactionEncoding: 'base64',
          },
        },
      ],
    };
  } else {
    /**
     *
     */
    // Get a generic priority fee estimate for a swap through Jupiter
    // All swaps are done through Jupiter regardless so this should be a good estimate
    request = {
      jsonrpc: '2.0',
      id: '1',
      method: 'getPriorityFeeEstimate',
      params: [
        {
          accountKeys: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
          options: {
            priorityLevel: priorityLevel || 'High',
          },
        },
      ],
    };
  }

  try {
    const response = await axios.post(
      'https://mainnet.helius-rpc.com/?api-key=e2ed9b0c-946c-4517-b414-360729bd6a77',
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (
      response.data.result &&
      typeof response.data.result.priorityFeeEstimate === 'number'
    ) {
      return response.data.result.priorityFeeEstimate;
    } else {
      throw new Error('Invalid response format from Helius API');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch priority fee: ${error.message}`);
    } else {
      throw error;
    }
  }
}
