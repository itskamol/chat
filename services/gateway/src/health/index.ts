/**
 * @file health/index.ts
 * @description Health check endpoints and service monitoring
 */
import { Application, Request, Response } from 'express';
import { serviceUrls } from '../config/index.js';

interface HealthCheckResult {
    status: string;
    gateway: string;
    timestamp: string;
    services: {
        userService: string;
        chatService: string;
        fileService: string;
        mediaService: string;
        notificationService: string;
    };
}

const checkServiceHealth = async (url: string): Promise<'up' | 'down'> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/health`, {
            method: 'GET',
            signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
        return response.ok ? 'up' : 'down';
    } catch (error) {
        console.warn(`Health check failed for ${url}:`, error);
        return 'down';
    }
};

export const healthCheckHandler = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const healthChecks = await Promise.allSettled([
            checkServiceHealth(serviceUrls.auth),
            checkServiceHealth(serviceUrls.chat),
            checkServiceHealth(serviceUrls.files),
            checkServiceHealth(serviceUrls.media),
            checkServiceHealth(serviceUrls.notifications),
        ]);

        const result: HealthCheckResult = {
            status: 'ok',
            gateway: 'running',
            timestamp: new Date().toISOString(),
            services: {
                userService:
                    healthChecks[0].status === 'fulfilled' &&
                    healthChecks[0].value === 'up'
                        ? 'up'
                        : 'down',
                chatService:
                    healthChecks[1].status === 'fulfilled' &&
                    healthChecks[1].value === 'up'
                        ? 'up'
                        : 'down',
                fileService:
                    healthChecks[2].status === 'fulfilled' &&
                    healthChecks[2].value === 'up'
                        ? 'up'
                        : 'down',
                mediaService:
                    healthChecks[3].status === 'fulfilled' &&
                    healthChecks[3].value === 'up'
                        ? 'up'
                        : 'down',
                notificationService:
                    healthChecks[4].status === 'fulfilled' &&
                    healthChecks[4].value === 'up'
                        ? 'up'
                        : 'down',
            },
        };

        res.json(result);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            gateway: 'running',
            timestamp: new Date().toISOString(),
            error: 'Failed to perform health checks',
        });
    }
};

export const setupHealthCheck = (app: Application): void => {
    app.get('/health', healthCheckHandler);
};
