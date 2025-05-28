import cors from 'cors';
import express from 'express';
import proxy from 'express-http-proxy';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Application } from 'express-serve-static-core';

const app: Application = express();

// CORS configuration
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001',
        ],
        credentials: true,
    })
);

// Configure express for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Environment-based service URLs (Docker-ready)
const serviceUrls = {
    auth: process.env.USER_SERVICE_URL,
    chat: process.env.CHAT_SERVICE_URL,
    files: process.env.FILE_SERVICE_URL,
    media: process.env.MEDIA_SERVICE_URL,
    notifications: process.env.NOTIFICATION_SERVICE_URL
};

if (!serviceUrls.auth || !serviceUrls.chat || !serviceUrls.files || !serviceUrls.media || !serviceUrls.notifications) {
    console.error('One or more service URLs are not defined in environment variables.');
    process.exit(1);
}

// Service proxies with error handling
const createServiceProxy = (url: string, options: any = {}) => {
    return proxy(url, {
        proxyErrorHandler: (err, res, next) => {
            console.error(`Proxy error for ${url}:`, err.message);
            res.status(503).json({ error: 'Service temporarily unavailable' });
        },
        timeout: 30000,
        ...options,
    });
};

// API Routes
app.use('/auth', createServiceProxy(serviceUrls.auth));
app.use('/users', createServiceProxy(serviceUrls.auth));
app.use('/chat', createServiceProxy(serviceUrls.chat));
app.use('/messages', createServiceProxy(serviceUrls.chat));
app.use('/files', createServiceProxy(serviceUrls.files));
app.use('/media', createServiceProxy(serviceUrls.media));
app.use('/notifications', createServiceProxy(serviceUrls.notifications));

// WebSocket proxy for real-time features - TO'G'RILANGAN
const wsProxy = createProxyMiddleware({
    target: serviceUrls.chat,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/ws': '/ws'  // Path rewrite agar kerak bo'lsa
    }
});

app.use('/ws', wsProxy);


// Health check endpoint
app.get('/health', async (req, res) => {
    const healthChecks = await Promise.allSettled([
        fetch(`${serviceUrls.auth}/health`).catch(() => ({ status: 'down' })),
        fetch(`${serviceUrls.chat}/health`).catch(() => ({ status: 'down' })),
        fetch(`${serviceUrls.files}/health`).catch(() => ({ status: 'down' })),
    ]);

    res.json({
        status: 'ok',
        gateway: 'running',
        timestamp: new Date().toISOString(),
        services: {
            userService: healthChecks[0].status === 'fulfilled' ? 'up' : 'down',
            chatService: healthChecks[1].status === 'fulfilled' ? 'up' : 'down',
            fileService: healthChecks[2].status === 'fulfilled' ? 'up' : 'down',
        },
    });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.GATEWAY_PORT || 8080;

const server = app.listen(PORT, () => {
    console.log(`Gateway is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Services:`, serviceUrls);
});

// WebSocket upgrade handling
server.on('upgrade', wsProxy.upgrade);

const exitHandler = () => {
    if (server) {
        server.close(() => {
            console.info('Gateway server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    console.error('🚨 Gateway error:', error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);
