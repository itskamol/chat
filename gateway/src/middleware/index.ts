/**
 * @file middleware/index.ts
 * @description Common middleware configuration for gateway
 */
import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export const setupCors = (app: Application): void => {
    app.use(
        cors({
            origin: config.allowedOrigins,
            credentials: true,
        })
    );
};

export const setupBodyParsing = (app: Application): void => {
    app.use(express.json({ limit: config.bodyLimit }));
    app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
};

export const setupLogging = (app: Application): void => {
    app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
};

export const setupMiddleware = (app: Application): void => {
    setupCors(app);
    setupBodyParsing(app);
    // Note: Logging middleware is setup after routes to avoid duplicating logs
};
