import express, { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import cors from 'cors';
import path from 'path';
import { Application } from 'express-serve-static-core';

const app: Application = express();

// Configure express for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS
app.use(
    cors({
        origin: 'http://localhost:3000', // Update with your frontend URL
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400, // 24 hours
    })
);

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

const auth = proxy('http://localhost:8081');
const messages = proxy('http://localhost:8082');
const notifications = proxy('http://localhost:8083');

app.use('/api/auth', auth);
app.use('/api/users', auth);
app.use('/api/messages', messages);
app.use('/api/notifications', notifications);

interface FileError extends Error {
    code?: string;
}

// File serving route with improved security and error handling
// File serving middleware
const serveFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filename = req.params.filename;
        
        // Basic path validation
        if (!filename || filename.includes('..') || filename.includes('/')) {
            res.status(400).send('Invalid filename');
            return;
        }

        const filePath = path.join(process.cwd(), '..', 'uploads', 'temp', filename);
        
        res.sendFile(
            filePath,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'private, max-age=3600',
                },
            },
            (err: FileError | null) => {
                if (err) {
                    console.error('File serving error:', err);
                    if (err.code === 'ENOENT') {
                        res.status(404).send('File not found');
                    } else {
                        res.status(500).send('Internal server error');
                    }
                } else {
                    console.log('File served successfully:', filename);
                }
            }
        );
    } catch (error) {
        next(error);
    }
};

app.get('/media/:filename', serveFile);

const server = app.listen(8080, () => {
    console.log('Gateway is Listening to Port 8080');
});

const exitHandler = () => {
    if (server) {
        server.close(() => {
            console.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    console.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
