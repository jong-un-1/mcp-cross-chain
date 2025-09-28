import { Hono } from 'hono';
import { WatcherService } from './watcher-service';
import type { Env } from '../../core/types';

/**
 * Watcher Routes
 * Handles system monitoring, metrics, and alerts
 */
export function createWatcherRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // Health check
  app.get('/health', async (c) => {
    try {
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const health = await watcher.healthCheck();
      
      return c.json(health);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({
        service: 'watcher',
        status: 'unhealthy',
        error: errorMessage,
        timestamp: Date.now(),
      }, 500);
    }
  });

  // Get system metrics summary
  app.get('/metrics/summary', async (c) => {
    try {
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const summary = await watcher.getSystemMetricsSummary();
      
      return c.json({
        success: true,
        data: summary,
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

  // Get specific metric data
  app.get('/metrics/:metricName', async (c) => {
    try {
      const metricName = c.req.param('metricName');
      const timeRange = parseInt(c.req.query('timeRange') || '3600000'); // 1 hour default
      const limit = parseInt(c.req.query('limit') || '1000');
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const metrics = await watcher.getMetricsByName(metricName, timeRange, limit);
      
      return c.json({
        success: true,
        data: metrics,
        metadata: {
          metricName,
          timeRange,
          limit,
          count: metrics.length,
        },
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

  // Record a custom metric
  app.post('/metrics', async (c) => {
    try {
      const body = await c.req.json();
      const { metric, value, labels = {} } = body;
      
      if (!metric || value === undefined) {
        return c.json({
          success: false,
          error: 'Missing required fields: metric, value',
          timestamp: Date.now(),
        }, 400);
      }
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      await watcher.recordMetric(metric, parseFloat(value), labels);
      
      return c.json({
        success: true,
        message: 'Metric recorded successfully',
        data: { metric, value, labels },
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

  // Get active alerts
  app.get('/alerts', async (c) => {
    try {
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const alerts = await watcher.getActiveAlerts();
      
      return c.json({
        success: true,
        data: alerts,
        count: alerts.length,
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

  // Get alert history
  app.get('/alerts/history', async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') || '100');
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const history = await watcher.getAlertHistory(limit);
      
      return c.json({
        success: true,
        data: history,
        pagination: {
          limit,
          count: history.length,
        },
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

  // Acknowledge an alert
  app.post('/alerts/:alertId/acknowledge', async (c) => {
    try {
      const alertId = c.req.param('alertId');
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      await watcher.acknowledgeAlert(alertId);
      
      return c.json({
        success: true,
        message: `Alert ${alertId} acknowledged`,
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

  // Resolve an alert
  app.post('/alerts/:alertId/resolve', async (c) => {
    try {
      const alertId = c.req.param('alertId');
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      await watcher.resolveAlert(alertId);
      
      return c.json({
        success: true,
        message: `Alert ${alertId} resolved`,
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

  // Add new alert rule
  app.post('/alerts/rules', async (c) => {
    try {
      const body = await c.req.json();
      const { metric, condition, duration = 0, severity = 'warning', enabled = true } = body;
      
      if (!metric || !condition) {
        return c.json({
          success: false,
          error: 'Missing required fields: metric, condition',
          timestamp: Date.now(),
        }, 400);
      }
      
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      const ruleId = await watcher.addAlertRule({
        metric,
        condition,
        duration,
        severity,
        enabled,
      });
      
      return c.json({
        success: true,
        message: 'Alert rule added successfully',
        data: { ruleId, metric, condition, duration, severity, enabled },
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

  // Collect system metrics (called by cron)
  app.post('/collect', async (c) => {
    try {
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      await watcher.collectSystemMetrics();
      
      return c.json({
        success: true,
        message: 'System metrics collection completed',
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

  // Flush metrics buffer to Prometheus
  app.post('/flush', async (c) => {
    try {
      const watcher = new WatcherService(c.env);
      await watcher.initialize();
      
      await watcher.flushMetricsBuffer();
      
      return c.json({
        success: true,
        message: 'Metrics buffer flushed to Prometheus',
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

  return app;
}

// Create and export default instance
const watcherRoutes = createWatcherRoutes();
export default watcherRoutes;