import { Router } from 'express';
import MessageController from '../controllers/MessageController';
import FileController from '../controllers/FileController';
import { authMiddleware } from '../middleware';
import upload from '../middleware/uploadMiddleware';

const messageRoutes = Router();

// Text message routes
messageRoutes.post(
    '/send',
    // @ts-ignore
    authMiddleware,
    MessageController.send
);
messageRoutes.get(
    '/get/:receiverId',
    // @ts-ignore
    authMiddleware,
    MessageController.getConversation
);

// File upload route
messageRoutes.post(
    '/upload',
    // @ts-ignore
    authMiddleware,
    upload.single('mediaFile'),
    FileController.uploadFile
);

export default messageRoutes;
