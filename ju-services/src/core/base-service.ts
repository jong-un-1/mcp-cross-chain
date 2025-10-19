import type { Env } from './types';
import { ServiceError } from './types';

/**
 * Base Service Class
 * All microservices extend this class for common functionality
 */
export abstract class BaseService {
  protected env: Env;
  protected logger: ServiceLogger;

  constructor(env: Env) {
    this.env = env;
    this.logger = new ServiceLogger('base-service');
  }

  abstract get serviceName(): string;

  protected updateLogger(): void {
    this.logger = new ServiceLogger(this.serviceName);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('Service initializing...', { service: this.serviceName });
    await this.onInitialize();
    this.logger.info('Service initialized', { service: this.serviceName });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Service cleaning up...', { service: this.serviceName });
    await this.onCleanup();
    this.logger.info('Service cleaned up', { service: this.serviceName });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const health = await this.onHealthCheck();
      return {
        service: this.serviceName,
        status: 'healthy',
        timestamp: Date.now(),
        details: health,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Health check failed', { error: errorMessage });
      return {
        service: this.serviceName,
        status: 'unhealthy',
        timestamp: Date.now(),
        error: errorMessage,
      };
    }
  }

  /**
   * Override in subclasses
   */
  protected async onInitialize(): Promise<void> {
    // Default implementation
  }

  protected async onCleanup(): Promise<void> {
    // Default implementation
  }

  protected async onHealthCheck(): Promise<Record<string, any>> {
    return {};
  }

  /**
   * Cache utilities
   */
  protected async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.env.KV) return null;
    
    try {
      const cached = await this.env.KV.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Cache get failed', { key, error: errorMessage });
      return null;
    }
  }

  protected async setCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.env.KV) return;
    
    try {
      const options = ttl ? { expirationTtl: ttl } : undefined;
      await this.env.KV.put(key, JSON.stringify(value), options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Cache set failed', { key, error: errorMessage });
    }
  }

  protected async deleteFromCache(key: string): Promise<void> {
    if (!this.env.KV) return;
    
    try {
      await this.env.KV.delete(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Cache delete failed', { key, error: errorMessage });
    }
  }

  /**
   * Database utilities
   */
  protected async queryDatabase(sql: string, params?: any[]): Promise<any> {
    if (!this.env.D1_DATABASE) {
      throw new ServiceError('Database not available', this.serviceName, 'DB_ERROR');
    }

    try {
      const result = await this.env.D1_DATABASE.prepare(sql).bind(...(params || [])).all();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Database query failed', { sql, error: errorMessage });
      throw new ServiceError('Database error', this.serviceName, 'DB_ERROR');
    }
  }

  /**
   * HTTP utilities
   */
  protected async httpRequest<T>(
    url: string, 
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${this.serviceName}/1.0`,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('HTTP request failed', { url, error: errorMessage });
      throw new ServiceError('HTTP request failed', this.serviceName, 'HTTP_ERROR');
    }
  }
}

/**
 * Service Logger
 */
export class ServiceLogger {
  constructor(private service: string) {}

  info(message: string, meta: Record<string, any> = {}) {
    console.log(JSON.stringify({
      level: 'info',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  warn(message: string, meta: Record<string, any> = {}) {
    console.warn(JSON.stringify({
      level: 'warn',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  error(message: string, meta: Record<string, any> = {}) {
    console.error(JSON.stringify({
      level: 'error',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  debug(message: string, meta: Record<string, any> = {}) {
    // Only log debug in development
    console.debug(JSON.stringify({
      level: 'debug',
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }
}

/**
 * Service Health Status
 */
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  details?: Record<string, any>;
  error?: string;
}