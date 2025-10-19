import { BaseService } from '../../core/base-service';
import type { 
  Env, 
  MetricPoint, 
  AlertRule, 
  AlertSeverity,
  SystemMetrics
} from '../../core/types';
import { HealthStatus } from '../../core/types';

/**
 * Watcher Service
 * 
 * Responsibilities:
 * - Tracks metrics evolution overtime
 * - Publishes metrics to Prometheus
 * - Extracts relevant data from orders
 * - Tracks protocol volume
 * - Tracks orchestrator stats like balance and usage
 */
export class WatcherService extends BaseService {
  private metricsBuffer: MetricPoint[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private lastMetricsFlush: number = Date.now();

  constructor(env: Env) {
    super(env);
  }

  get serviceName(): string {
    return 'watcher';
  }

  protected async onInitialize(): Promise<void> {
    await this.loadAlertRules();
    await this.setupDefaultMetrics();
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    const activeAlerts = await this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical').length;
    const metricsCount = await this.getTotalMetricsCount();

    return {
      activeAlerts: activeAlerts.length,
      criticalAlerts,
      totalMetricsCollected: metricsCount,
      alertRules: this.alertRules.size,
      metricsBufferSize: this.metricsBuffer.length,
      lastMetricsFlush: this.lastMetricsFlush,
    };
  }

  /**
   * Load alert rules from database
   */
  private async loadAlertRules(): Promise<void> {
    try {
      const results = await this.queryDatabase(
        'SELECT * FROM alert_rules WHERE enabled = true'
      );

      for (const rule of results.results || []) {
        this.alertRules.set(rule.id, {
          id: rule.id,
          metric: rule.metric_name,
          condition: `${rule.condition_operator} ${rule.condition_value}`,
          duration: rule.duration_seconds || 0,
          severity: rule.severity as AlertSeverity,
          enabled: rule.enabled,
        });
      }

      this.logger.info('Alert rules loaded', { 
        ruleCount: this.alertRules.size 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to load alert rules', { error: errorMessage });
    }
  }

  /**
   * Setup default system metrics collection
   */
  private async setupDefaultMetrics(): Promise<void> {
    // System health metrics
    await this.recordMetric('system_health', 1, { service: 'watcher' });
    
    this.logger.info('Default metrics setup completed');
  }

  /**
   * Record a metric point
   */
  async recordMetric(
    metricName: string, 
    value: number, 
    labels: Record<string, string> = {}
  ): Promise<void> {
    const metricPoint: MetricPoint = {
      metric: metricName,
      value,
      labels,
      timestamp: Date.now(),
    };

    // Add to buffer
    this.metricsBuffer.push(metricPoint);

    // Store in database
    await this.storeMetricInDatabase(metricPoint);

    // Check alert rules
    await this.checkAlertRules(metricPoint);

    // Flush buffer if it gets too large
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetricsBuffer();
    }

    this.logger.debug('Metric recorded', { 
      metric: metricName, 
      value, 
      labels 
    });
  }

  /**
   * Store metric in database
   */
  private async storeMetricInDatabase(metric: MetricPoint): Promise<void> {
    try {
      await this.queryDatabase(
        `INSERT INTO system_metrics (id, metric_name, metric_value, labels, timestamp, service) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `${metric.metric}-${metric.timestamp}-${Math.random()}`,
          metric.metric,
          metric.value,
          JSON.stringify(metric.labels),
          metric.timestamp,
          this.serviceName,
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to store metric in database', { 
        metric: metric.metric,
        error: errorMessage 
      });
    }
  }

  /**
   * Check alert rules for a metric
   */
  private async checkAlertRules(metric: MetricPoint): Promise<void> {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (rule.metric !== metric.metric) continue;

      try {
        const isTriggered = this.evaluateAlertCondition(rule.condition, metric.value);
        
        if (isTriggered) {
          await this.triggerAlert(ruleId, rule, metric);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn('Failed to evaluate alert rule', { 
          ruleId, 
          error: errorMessage 
        });
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(condition: string, value: number): boolean {
    // Parse condition like "> 100", "< 0.01", "== 0"
    const match = condition.match(/^([><=!]+)\s*([0-9.]+)$/);
    if (!match) return false;

    const operator = match[1];
    const threshold = parseFloat(match[2] || '0');

    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return Math.abs(value - threshold) < 0.0001;
      case '!=':
        return Math.abs(value - threshold) >= 0.0001;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    ruleId: string, 
    rule: AlertRule, 
    metric: MetricPoint
  ): Promise<void> {
    // Check if alert is already active
    const existingAlert = await this.queryDatabase(
      'SELECT id FROM active_alerts WHERE rule_id = ? AND resolved_at IS NULL',
      [ruleId]
    );

    if (existingAlert.results && existingAlert.results.length > 0) {
      this.logger.debug('Alert already active', { ruleId });
      return;
    }

    // Create new alert
    const alertId = `alert-${ruleId}-${Date.now()}`;
    
    await this.queryDatabase(
      `INSERT INTO active_alerts 
       (id, rule_id, metric_name, current_value, severity, started_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [alertId, ruleId, rule.metric, metric.value, rule.severity, Date.now()]
    );

    this.logger.warn('Alert triggered', {
      alertId,
      ruleId,
      metric: rule.metric,
      value: metric.value,
      severity: rule.severity,
    });

    // Send to external alerting system (Prometheus Alertmanager, etc.)
    await this.sendAlertToExternal({
      id: alertId,
      rule: rule.metric,
      value: metric.value,
      severity: rule.severity,
      timestamp: metric.timestamp,
    });
  }

  /**
   * Send alert to external system
   */
  private async sendAlertToExternal(alert: any): Promise<void> {
    if (!this.env.PROMETHEUS_ENDPOINT) {
      this.logger.debug('No Prometheus endpoint configured for alerts');
      return;
    }

    try {
      await this.httpRequest(`${this.env.PROMETHEUS_ENDPOINT}/api/v1/alerts`, {
        method: 'POST',
        body: JSON.stringify({
          alerts: [{
            labels: {
              alertname: alert.rule,
              severity: alert.severity,
              service: this.serviceName,
            },
            annotations: {
              summary: `${alert.rule} alert triggered`,
              description: `Metric ${alert.rule} has value ${alert.value}`,
            },
            startsAt: new Date(alert.timestamp).toISOString(),
          }]
        }),
      });

      this.logger.info('Alert sent to external system', { alertId: alert.id });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send alert to external system', { 
        alertId: alert.id,
        error: errorMessage 
      });
    }
  }

  /**
   * Flush metrics buffer to Prometheus
   */
  async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      await this.sendMetricsToPrometheus(this.metricsBuffer);
      
      this.logger.info('Metrics buffer flushed', { 
        metricCount: this.metricsBuffer.length 
      });
      
      this.metricsBuffer = [];
      this.lastMetricsFlush = Date.now();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to flush metrics buffer', { error: errorMessage });
    }
  }

  /**
   * Send metrics to Prometheus
   */
  private async sendMetricsToPrometheus(metrics: MetricPoint[]): Promise<void> {
    if (!this.env.PROMETHEUS_ENDPOINT) {
      this.logger.debug('No Prometheus endpoint configured');
      return;
    }

    try {
      // Convert metrics to Prometheus format
      const prometheusMetrics = metrics.map(metric => {
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        
        const labelString = labels ? `{${labels}}` : '';
        return `${metric.metric}${labelString} ${metric.value} ${metric.timestamp}`;
      }).join('\n');

      await this.httpRequest(`${this.env.PROMETHEUS_ENDPOINT}/api/v1/import/prometheus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: prometheusMetrics,
      });

      this.logger.debug('Metrics sent to Prometheus', { 
        metricCount: metrics.length 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send metrics to Prometheus', { error: errorMessage });
    }
  }

  /**
   * Collect system metrics (called by cron)
   */
  async collectSystemMetrics(): Promise<void> {
    this.logger.info('Collecting system metrics');

    try {
      // Collect various system metrics
      await this.collectServiceMetrics();
      await this.collectOrderMetrics();
      await this.collectProtocolMetrics();
      await this.collectOrchestratorMetrics();

      this.logger.info('System metrics collection completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to collect system metrics', { error: errorMessage });
    }
  }

  /**
   * Collect service health metrics
   */
  private async collectServiceMetrics(): Promise<void> {
    const services = ['keeper', 'funder', 'indexer', 'watcher', 'quoter'];
    
    for (const service of services) {
      try {
        // In a real implementation, this would call each service's health endpoint
        const isHealthy = Math.random() > 0.1; // 90% healthy simulation
        
        await this.recordMetric('service_health', isHealthy ? 1 : 0, { service });
        
        // Record response times (mock data)
        const responseTime = Math.random() * 100 + 50; // 50-150ms
        await this.recordMetric('service_response_time_ms', responseTime, { service });

      } catch (error) {
        await this.recordMetric('service_health', 0, { service });
      }
    }
  }

  /**
   * Collect order-related metrics
   */
  private async collectOrderMetrics(): Promise<void> {
    try {
      // Get pending orders count
      const pendingOrders = await this.queryDatabase(
        'SELECT COUNT(*) as count FROM orders WHERE status = ?',
        ['pending']
      );
      
      await this.recordMetric(
        'pending_orders_count', 
        pendingOrders.results?.[0]?.count || 0
      );

      // Get completed orders in last 24h
      const completedOrders = await this.queryDatabase(
        'SELECT COUNT(*) as count FROM orders WHERE status = ? AND created_at > ?',
        ['completed', Date.now() - 24 * 60 * 60 * 1000]
      );
      
      await this.recordMetric(
        'orders_completed_24h', 
        completedOrders.results?.[0]?.count || 0
      );

      // Get failed orders in last 24h
      const failedOrders = await this.queryDatabase(
        'SELECT COUNT(*) as count FROM orders WHERE status = ? AND created_at > ?',
        ['failed', Date.now() - 24 * 60 * 60 * 1000]
      );
      
      await this.recordMetric(
        'orders_failed_24h', 
        failedOrders.results?.[0]?.count || 0
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to collect order metrics', { error: errorMessage });
    }
  }

  /**
   * Collect protocol volume metrics
   */
  private async collectProtocolMetrics(): Promise<void> {
    try {
      // Get total volume from completed orders (this would need proper USD conversion)
      const volumeResult = await this.queryDatabase(
        `SELECT SUM(CAST(input_amount as REAL)) as volume 
         FROM orders WHERE status = 'completed' AND created_at > ?`,
        [Date.now() - 24 * 60 * 60 * 1000]
      );
      
      await this.recordMetric(
        'protocol_volume_24h_usd', 
        volumeResult.results?.[0]?.volume || 0
      );

      // Get unique users in last 24h
      const uniqueUsers = await this.queryDatabase(
        'SELECT COUNT(DISTINCT user_address) as count FROM orders WHERE created_at > ?',
        [Date.now() - 24 * 60 * 60 * 1000]
      );
      
      await this.recordMetric(
        'unique_users_24h', 
        uniqueUsers.results?.[0]?.count || 0
      );

      // Get liquidity pool count (mock for now)
      await this.recordMetric('active_liquidity_pools', Math.floor(Math.random() * 100 + 50));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to collect protocol metrics', { error: errorMessage });
    }
  }

  /**
   * Collect orchestrator metrics (funding, gas, etc.)
   */
  private async collectOrchestratorMetrics(): Promise<void> {
    try {
      // Get funding status
      const fundingResult = await this.queryDatabase(
        'SELECT COUNT(*) as count FROM monitored_addresses WHERE status = ?',
        ['active']
      );
      
      await this.recordMetric(
        'monitored_addresses_count', 
        fundingResult.results?.[0]?.count || 0
      );

      // Get addresses needing funding (mock calculation)
      const needsFunding = Math.floor(Math.random() * 5); // 0-4 addresses need funding
      await this.recordMetric('addresses_needing_funding', needsFunding);

      // Get recent funding transactions
      const recentFunding = await this.queryDatabase(
        'SELECT COUNT(*) as count FROM funding_transactions WHERE created_at > ?',
        [Date.now() - 24 * 60 * 60 * 1000]
      );
      
      await this.recordMetric(
        'funding_transactions_24h', 
        recentFunding.results?.[0]?.count || 0
      );

      // Get minimum funding balance across all addresses (mock)
      const minBalance = Math.random() * 0.1 + 0.001; // 0.001-0.101 ETH
      await this.recordMetric('min_funding_balance', minBalance);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to collect orchestrator metrics', { error: errorMessage });
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<any[]> {
    const result = await this.queryDatabase(
      'SELECT * FROM active_alerts WHERE resolved_at IS NULL ORDER BY started_at DESC'
    );
    return result.results || [];
  }

  /**
   * Get alert history
   */
  async getAlertHistory(limit: number = 100): Promise<any[]> {
    const result = await this.queryDatabase(
      'SELECT * FROM active_alerts ORDER BY started_at DESC LIMIT ?',
      [limit.toString()]
    );
    return result.results || [];
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await this.queryDatabase(
      'UPDATE active_alerts SET resolved_at = ? WHERE id = ?',
      [Date.now(), alertId]
    );

    this.logger.info('Alert resolved', { alertId });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.queryDatabase(
      'UPDATE active_alerts SET acknowledged_at = ? WHERE id = ?',
      [Date.now(), alertId]
    );

    this.logger.info('Alert acknowledged', { alertId });
  }

  /**
   * Add or update alert rule
   */
  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const ruleId = `rule-${Date.now()}-${Math.random()}`;
    
    const [operator, value] = rule.condition.split(' ');
    
    await this.queryDatabase(
      `INSERT INTO alert_rules 
       (id, name, metric_name, condition_operator, condition_value, 
        duration_seconds, severity, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ruleId,
        rule.metric,
        rule.metric,
        operator,
        parseFloat(value || '0'),
        rule.duration,
        rule.severity,
        rule.enabled,
        Date.now(),
        Date.now(),
      ]
    );

    // Update in-memory cache
    this.alertRules.set(ruleId, { ...rule, id: ruleId });

    this.logger.info('Alert rule added', { ruleId, metric: rule.metric });
    
    return ruleId;
  }

  /**
   * Get metrics by name
   */
  async getMetricsByName(
    metricName: string, 
    timeRange: number = 3600000, // 1 hour default
    limit: number = 1000
  ): Promise<MetricPoint[]> {
    const result = await this.queryDatabase(
      `SELECT * FROM system_metrics 
       WHERE metric_name = ? AND timestamp > ? 
       ORDER BY timestamp DESC LIMIT ?`,
      [metricName, Date.now() - timeRange, limit.toString()]
    );

    return (result.results || []).map((row: any) => ({
      metric: row.metric_name,
      value: row.metric_value,
      labels: JSON.parse(row.labels || '{}'),
      timestamp: row.timestamp,
    }));
  }

  /**
   * Get system metrics summary
   */
  async getSystemMetricsSummary(): Promise<SystemMetrics> {
    // This would aggregate various metrics
    const totalVolume = await this.getLatestMetricValue('protocol_volume_24h_usd') || '0';
    const totalUsers = await this.getLatestMetricValue('unique_users_24h') || 0;
    const activePools = await this.getLatestMetricValue('active_liquidity_pools') || 0;
    const pendingOrders = await this.getLatestMetricValue('pending_orders_count') || 0;

    const activeAlerts = await this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    let healthStatus: HealthStatus = HealthStatus.HEALTHY;
    if (criticalAlerts.length > 0) {
      healthStatus = HealthStatus.CRITICAL;
    } else if (activeAlerts.length > 0) {
      healthStatus = HealthStatus.WARNING;
    }

    return {
      timestamp: Date.now(),
      totalVolume24h: totalVolume.toString(),
      totalUsers: Math.floor(totalUsers),
      activePools: Math.floor(activePools),
      pendingOrders: Math.floor(pendingOrders),
      systemHealth: healthStatus,
    };
  }

  /**
   * Get latest metric value
   */
  private async getLatestMetricValue(metricName: string): Promise<number> {
    const result = await this.queryDatabase(
      'SELECT metric_value FROM system_metrics WHERE metric_name = ? ORDER BY timestamp DESC LIMIT 1',
      [metricName]
    );
    
    return result.results?.[0]?.metric_value || 0;
  }

  /**
   * Get total metrics count
   */
  private async getTotalMetricsCount(): Promise<number> {
    const result = await this.queryDatabase('SELECT COUNT(*) as count FROM system_metrics');
    return result.results?.[0]?.count || 0;
  }
}