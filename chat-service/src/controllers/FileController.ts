import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';
import Message from '../database/models/MessageModel';
import { logger } from '../utils';
import { ApiError } from '../utils/apiError';
import type { AuthRequest } from '../types/message.types';

export default class FileController {
    static async uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const senderId = req.user?._id;

            if (!senderId) {
                return next(new ApiError(401, 'Authentication required'));
            }

            const { receiverId, chatId, originalMessage } = req.body;

            if (!receiverId) {
                return next(new ApiError(400, 'Receiver ID is required'));
            }

            if (!req.file) {
                return next(new ApiError(400, 'File is required'));
            }

            // Validate file type
            if (!FileService.validateFileType(req.file.mimetype)) {
                return next(new ApiError(415, 'Unsupported file type'));
            }

            // Get message type and upload file
            const messageType = FileService.getMessageType(req.file.mimetype);
            const { fileUrl, s3Key } = await FileService.uploadFile(req.file);

            // Create and save message
            const newMessage = new Message({
                senderId,
                receiverId,
                chatId,
                message: originalMessage || req.file.originalname,
                originalMessage,
                messageType,
                fileUrl,
                fileName: req.file.originalname,
                storedFileName: s3Key,
                fileMimeType: req.file.mimetype,
                fileSize: req.file.size,
                status: 'Sent'
            });

            await newMessage.save();

            logger.info('File processed and message saved:', {
                messageId: newMessage._id,
                fileUrl,
                originalFilename: req.file.originalname
            });

            res.status(201).json(newMessage);

        } catch (error: any) {
            logger.error('Upload controller error:', error);

            // Clean up file on error if it exists
            if (req.file?.path) {
                await FileService.cleanupFile(req.file.path);
            }

            next(new ApiError(500, error.message || 'Internal server error'));
        }
    }
}
