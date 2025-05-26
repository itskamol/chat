import { Router } from 'express';
import { authMiddleware } from '../middleware';
import { FileAccessController } from '../controllers/FileAccessController';

const fileRoutes = Router();

fileRoutes.get('/media/:filename', 
    // @ts-ignore
    authMiddleware, FileAccessController.serveFile);

export default fileRoutes;
