import { Router } from 'express';
import { authMiddleware } from '../middleware';
import { FileAccessController } from '../controllers/FileAccessController';

const fileRoutes = Router();

fileRoutes.get('/:filename', 
    // @ts-ignore
    authMiddleware, FileAccessController.serveFile);

export default fileRoutes;
