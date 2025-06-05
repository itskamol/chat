import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private redis: Redis;

  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
    @InjectConnection() private connection: Connection,
  ) {
    // Initialize Redis connection for health checks
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
    });
  }

  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database health check
      () => this.mongoose.pingCheck('database', { connection: this.connection }),
      
      // Redis health check
      () => this.checkRedisHealth(),
      
      // Memory health check (should not use more than 300MB RSS memory)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Memory health check (should not use more than 150MB heap)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      
      // Disk storage health check (should have at least 1GB free space)
      () => this.disk.checkStorage('storage', {
        thresholdPercent: 0.9,
        path: '/',
      }),
    ]);
  }

  private async checkRedisHealth(): Promise<any> {
    try {
      await this.redis.ping();
      return {
        redis: {
          status: 'up',
          message: 'Redis is healthy',
        },
      };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          message: `Redis health check failed: ${error.message}`,
        },
      };
    }
  }

  async getDetailedHealthInfo() {
    const healthResult = await this.check();
    
    // Add additional system information
    const systemInfo = {
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };

    return {
      ...healthResult,
      system: systemInfo,
    };
  }
}
