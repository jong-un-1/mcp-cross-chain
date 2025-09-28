import { BaseService } from '../../core/base-service';
import type { 
  Env, 
  ScheduledTask, 
  RebalanceConfig, 
  Order, 
  BalanceInfo
} from '../../core/types';
import { 
  TaskStatus, 
  OrderStatus,
  ChainId
} from '../../core/types';

/**
 * Keeper Service
 * 
 * Responsibilities:
 * - Runs scheduled tasks at intervals
 * - Rebalances liquidity across chains
 * - Checks for pending orders to solve
 * - Triggers Lit Actions to solve pending orders
 */
export class KeeperService extends BaseService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private rebalanceConfig: RebalanceConfig;

  constructor(env: Env) {
    super(env);
    
    // Default rebalance configuration
    this.rebalanceConfig = {
      minThreshold: 0.1, // 10%
      maxThreshold: 0.9, // 90%
      targetRatio: 0.5,  // 50%
      chains: [ChainId.ETHEREUM, ChainId.BSC, ChainId.POLYGON],
    };
  }

  get serviceName(): string {
    return 'keeper';
  }

  protected async onInitialize(): Promise<void> {
    await this.setupScheduledTasks();
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    const activeTasks = Array.from(this.tasks.values()).filter(
      task => task.status === TaskStatus.ACTIVE
    ).length;

    return {
      activeTasks,
      totalTasks: this.tasks.size,
      lastRebalance: await this.getFromCache('keeper:last_rebalance'),
      pendingOrders: await this.getPendingOrdersCount(),
    };
  }

  /**
   * Setup scheduled tasks
   */
  private async setupScheduledTasks(): Promise<void> {
    // Rebalance liquidity every 5 minutes
    this.addTask({
      id: 'rebalance-liquidity',
      name: 'Rebalance Liquidity',
      schedule: '*/5 * * * *', // Every 5 minutes
      lastRun: 0,
      nextRun: Date.now() + 5 * 60 * 1000,
      status: TaskStatus.ACTIVE,
    });

    // Check pending orders every 30 seconds
    this.addTask({
      id: 'check-pending-orders',
      name: 'Check Pending Orders',
      schedule: '*/30 * * * * *', // Every 30 seconds
      lastRun: 0,
      nextRun: Date.now() + 30 * 1000,
      status: TaskStatus.ACTIVE,
    });

    // Update funding status every 2 minutes
    this.addTask({
      id: 'update-funding-status',
      name: 'Update Funding Status',
      schedule: '*/2 * * * *', // Every 2 minutes
      lastRun: 0,
      nextRun: Date.now() + 2 * 60 * 1000,
      status: TaskStatus.ACTIVE,
    });

    this.logger.info('Scheduled tasks setup complete', {
      taskCount: this.tasks.size
    });
  }

  /**
   * Add a scheduled task
   */
  private addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    this.logger.info('Task added', { taskId: task.id, taskName: task.name });
  }

  /**
   * Execute scheduled tasks (called by cron)
   */
  async executeScheduledTasks(): Promise<void> {
    const now = Date.now();
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status !== TaskStatus.ACTIVE) continue;
      if (task.nextRun > now) continue;

      try {
        this.logger.info('Executing task', { taskId, taskName: task.name });
        
        await this.executeTask(taskId);
        
        // Update task status
        task.lastRun = now;
        task.nextRun = this.calculateNextRun(task.schedule, now);
        this.tasks.set(taskId, task);

        this.logger.info('Task completed', { taskId, nextRun: task.nextRun });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Task execution failed', { 
          taskId, 
          error: errorMessage 
        });
        
        // Mark task as failed
        task.status = TaskStatus.FAILED;
        this.tasks.set(taskId, task);
      }
    }
  }

  /**
   * Execute individual task
   */
  private async executeTask(taskId: string): Promise<void> {
    switch (taskId) {
      case 'rebalance-liquidity':
        await this.rebalanceLiquidity();
        break;
      case 'check-pending-orders':
        await this.checkPendingOrders();
        break;
      case 'update-funding-status':
        await this.updateFundingStatus();
        break;
      default:
        this.logger.warn('Unknown task', { taskId });
    }
  }

  /**
   * Rebalance liquidity across chains
   */
  private async rebalanceLiquidity(): Promise<void> {
    this.logger.info('Starting liquidity rebalance');

    try {
      // Get current balances across all chains
      const balances = await this.getCurrentBalances();
      
      // Calculate required rebalancing
      const rebalanceActions = this.calculateRebalanceActions(balances);
      
      if (rebalanceActions.length === 0) {
        this.logger.info('No rebalancing needed');
        return;
      }

      // Execute rebalancing via Lit Actions
      for (const action of rebalanceActions) {
        await this.triggerLitAction('rebalance', action);
      }

      // Cache last rebalance time
      await this.setCache('keeper:last_rebalance', Date.now(), 3600);
      
      this.logger.info('Liquidity rebalance completed', {
        actionsExecuted: rebalanceActions.length
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Liquidity rebalance failed', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Check for pending orders to solve
   */
  private async checkPendingOrders(): Promise<void> {
    try {
      const pendingOrders = await this.getPendingOrders();
      
      this.logger.debug('Checking pending orders', { count: pendingOrders.length });
      
      for (const order of pendingOrders) {
        await this.processOrder(order);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to check pending orders', { error: errorMessage });
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: Order): Promise<void> {
    try {
      // Check if order can be fulfilled
      const canFulfill = await this.canFulfillOrder(order);
      
      if (!canFulfill) {
        this.logger.debug('Order cannot be fulfilled', { orderId: order.id });
        return;
      }

      // Trigger Lit Action to solve the order
      const litActionResult = await this.triggerLitAction('solve_order', {
        orderId: order.id,
        inputToken: order.inputToken,
        outputToken: order.outputToken,
        inputAmount: order.inputAmount,
        minOutputAmount: order.minOutputAmount,
      });

      this.logger.info('Order processing triggered', {
        orderId: order.id,
        litActionId: litActionResult.id
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Order processing failed', { 
        orderId: order.id, 
        error: errorMessage 
      });
    }
  }

  /**
   * Update funding status for addresses
   */
  private async updateFundingStatus(): Promise<void> {
    this.logger.debug('Updating funding status');
    
    try {
      // This would typically call the Funder service
      // For now, just log the action
      const fundingStatus = await this.getFundingStatus();
      
      await this.setCache('keeper:funding_status', fundingStatus, 300);
      
      this.logger.debug('Funding status updated', { 
        addressCount: fundingStatus.length 
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update funding status', { error: errorMessage });
    }
  }

  /**
   * Get current balances across all chains
   */
  private async getCurrentBalances(): Promise<BalanceInfo[]> {
    // This would integrate with the Indexer service
    // Placeholder implementation
    return [];
  }

  /**
   * Calculate rebalancing actions needed
   */
  private calculateRebalanceActions(balances: BalanceInfo[]): any[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Trigger Lit Action
   */
  private async triggerLitAction(actionType: string, params: any): Promise<any> {
    if (!this.env.LIT_NETWORK_RPC) {
      throw new Error('Lit Network RPC not configured');
    }

    const request = {
      action: actionType,
      params,
      timestamp: Date.now(),
    };

    return await this.httpRequest(this.env.LIT_NETWORK_RPC, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get pending orders from database
   */
  private async getPendingOrders(): Promise<Order[]> {
    const result = await this.queryDatabase(
      'SELECT * FROM orders WHERE status = ? ORDER BY created_at ASC LIMIT 100',
      [OrderStatus.PENDING]
    );

    return result.results || [];
  }

  /**
   * Get pending orders count
   */
  private async getPendingOrdersCount(): Promise<number> {
    const result = await this.queryDatabase(
      'SELECT COUNT(*) as count FROM orders WHERE status = ?',
      [OrderStatus.PENDING]
    );

    return result.results?.[0]?.count || 0;
  }

  /**
   * Check if an order can be fulfilled
   */
  private async canFulfillOrder(order: Order): Promise<boolean> {
    // This would check liquidity, balances, etc.
    // Placeholder implementation
    return true;
  }

  /**
   * Get funding status
   */
  private async getFundingStatus(): Promise<any[]> {
    // This would call the Funder service
    // Placeholder implementation
    return [];
  }

  /**
   * Calculate next run time based on cron schedule
   */
  private calculateNextRun(schedule: string, currentTime: number): number {
    // Simple implementation - in production, use a proper cron parser
    if (schedule.includes('*/5 * * * *')) {
      return currentTime + 5 * 60 * 1000; // 5 minutes
    } else if (schedule.includes('*/30 * * * * *')) {
      return currentTime + 30 * 1000; // 30 seconds
    } else if (schedule.includes('*/2 * * * *')) {
      return currentTime + 2 * 60 * 1000; // 2 minutes
    }
    
    return currentTime + 60 * 1000; // Default 1 minute
  }

  /**
   * Get all tasks
   */
  async getTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values());
  }

  /**
   * Pause a task
   */
  async pauseTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = TaskStatus.PAUSED;
    this.tasks.set(taskId, task);
    
    this.logger.info('Task paused', { taskId });
  }

  /**
   * Resume a task
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = TaskStatus.ACTIVE;
    this.tasks.set(taskId, task);
    
    this.logger.info('Task resumed', { taskId });
  }
}