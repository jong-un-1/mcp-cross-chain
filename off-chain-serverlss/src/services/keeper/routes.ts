import { Hono } from 'hono';
import { KeeperService } from './keeper-service';
import type { Env } from '../../core/types';

/**
 * Keeper Routes
 * Handles scheduled task management and execution
 */
export function createKeeperRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // Get all scheduled tasks
  app.get('/tasks', async (c) => {
    try {
      const keeper = new KeeperService(c.env);
      await keeper.initialize();
      
      const tasks = await keeper.getTasks();
      
      return c.json({
        success: true,
        data: tasks,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Execute scheduled tasks (called by cron)
  app.post('/execute', async (c) => {
    try {
      const keeper = new KeeperService(c.env);
      await keeper.initialize();
      
      await keeper.executeScheduledTasks();
      
      return c.json({
        success: true,
        message: 'Scheduled tasks executed',
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Pause a specific task
  app.post('/tasks/:taskId/pause', async (c) => {
    try {
      const taskId = c.req.param('taskId');
      const keeper = new KeeperService(c.env);
      await keeper.initialize();
      
      await keeper.pauseTask(taskId);
      
      return c.json({
        success: true,
        message: `Task ${taskId} paused`,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Resume a specific task
  app.post('/tasks/:taskId/resume', async (c) => {
    try {
      const taskId = c.req.param('taskId');
      const keeper = new KeeperService(c.env);
      await keeper.initialize();
      
      await keeper.resumeTask(taskId);
      
      return c.json({
        success: true,
        message: `Task ${taskId} resumed`,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Health check
  app.get('/health', async (c) => {
    try {
      const keeper = new KeeperService(c.env);
      await keeper.initialize();
      
      const health = await keeper.healthCheck();
      
      return c.json(health);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        service: 'keeper',
        status: 'unhealthy',
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  return app;
}

// Create and export default instance
const keeperRoutes = createKeeperRoutes();
export default keeperRoutes;