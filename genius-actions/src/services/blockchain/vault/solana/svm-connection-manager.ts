import { Connection } from '@solana/web3.js';

export class ConnectionManager {
  private connections: Connection[];

  /**
   * Creates a connection manager for Solana RPCs
   * @param rpcUrls Array of RPC URLs to connect to
   */
  constructor(rpcUrls: string[]) {
    this.connections = rpcUrls.map((rpc) => new Connection(rpc));
  }

  /**
   * Executes an operation against all available connections until one succeeds
   * @param operation Function to execute against a connection
   * @returns Result of the successful operation
   * @throws Error if all connections fail
   */
  async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    for (const connection of this.connections) {
      try {
        const result = await operation(connection);
        return result;
      } catch (error: any) {
        console.error(
          `Operation failed on RPC ${connection.rpcEndpoint}:`,
          error.message,
        );
        // Continue to next connection on failure
      }
    }
    throw new Error('Operation failed on all RPC connections');
  }
}
