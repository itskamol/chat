/**
 * @file websocket/index.ts
 * @description WebSocket proxy configuration
 */
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Application } from 'express';
import { Server } from 'http';
import { serviceUrls } from '../config/index.js';

export const createWebSocketProxy = () => {
    interface WebSocketProxyOptions {
        target: string;
        changeOrigin: boolean;
        ws: boolean;
        pathRewrite: Record<string, string>;
        onProxyReqWs: (proxyReq: unknown, req: Request, socket: unknown) => void;
    }

    return createProxyMiddleware({
        target: serviceUrls.chat,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
            '^/ws': '/ws'
        },
        onProxyReqWs: (_proxyReq: unknown, req: Request, socket: unknown) => {
            console.log('WebSocket request:', req.url);
        }
    } as WebSocketProxyOptions);
};

export const setupWebSocketProxy = (app: Application): ReturnType<typeof createWebSocketProxy> => {
    const wsProxy = createWebSocketProxy();
    app.use('/ws', wsProxy);
    return wsProxy;
};

export const setupWebSocketUpgrade = (server: Server, wsProxy: ReturnType<typeof createWebSocketProxy>): void => {
    server.on('upgrade', wsProxy.upgrade);
};
