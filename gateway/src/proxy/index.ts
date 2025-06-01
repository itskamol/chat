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
    app.use('/auth', createServiceProxy(serviceUrls.auth));
    app.use('/users', createServiceProxy(serviceUrls.auth));
    
    // Chat service routes
    app.use('/chat', createServiceProxy(serviceUrls.chat));
    app.use('/messages', createServiceProxy(serviceUrls.chat));
    
    // File service routes
    app.use('/files', createServiceProxy(serviceUrls.files));
    
    // Media service routes
    app.use('/media', createServiceProxy(serviceUrls.media));
    
    // Notification service routes
    app.use('/notifications', createServiceProxy(serviceUrls.notifications));
};
