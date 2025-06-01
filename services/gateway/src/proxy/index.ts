/**
 * @file proxy/index.ts
 * @description Service proxy configuration and setup
 */
import proxy from 'express-http-proxy';
import { Application, Response } from 'express';
import { serviceUrls, config } from '../config/index.js';

import { RequestHandler } from 'express';

export const createServiceProxy = (url: string, options: any = {}): RequestHandler => {
    return proxy(url, {
        proxyErrorHandler: (err: Error, res: Response, next: Function) => {
            console.error(`Proxy error for ${url}:`, err.message);
            res.status(503).json({ error: 'Service temporarily unavailable' });
        },
        timeout: config.proxyTimeout,
        ...options,
    });
};

export const setupServiceProxies = (app: Application): void => {
    // Authentication service routes
    app.use('/api/auth', createServiceProxy(serviceUrls.auth));
    app.use('/api/users', createServiceProxy(serviceUrls.auth));
    
    // Chat service routes
    app.use('/api/chat', createServiceProxy(serviceUrls.chat));
    app.use('/api/messages', createServiceProxy(serviceUrls.chat));
    
    // File service routes
    app.use('/api/files', createServiceProxy(serviceUrls.files));
    
    // Media service routes
    app.use('/api/media', createServiceProxy(serviceUrls.media));
    
    // Notification service routes
    app.use('/api/notifications', createServiceProxy(serviceUrls.notifications));
};
