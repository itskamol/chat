import path from 'path';
import fs from 'fs';
import { logger } from '../utils';
import config from '../config/config';
import Message from '../database/models/MessageModel';
import { Message as IMessage } from '@chat/shared'; // Assuming IMessage is the interface for Message
import { ApiError } from '../utils/apiError';

export class FileAccessService {
    private static readonly UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads', 'temp');

    static validateFilename(filename: string): boolean {
        return !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
    }

    static async validateUserAccess(userId: string, filename: string): Promise<IMessage> {
        const message = await Message.findOne({ storedFileName: filename });

        if (!message) {
            logger.warn(`File metadata not found in DB for filename: ${filename}, requested by user ${userId}`);
            throw new ApiError(404, 'File not found or metadata missing');
        }

        const isSender = message.senderId === userId.toString();
        const isReceiver = message.receiverId === userId.toString();

        if (!isSender && !isReceiver) {
            logger.warn(`Unauthorized attempt to access file ${filename} by user ${userId}. Sender: ${message.senderId}, Receiver: ${message.receiverId}`);
            throw new ApiError(403, 'Forbidden. You do not have access to this file');
        }

        return message;
    }

    static async getLocalFilePath(filename: string, userId: string): Promise<string> {
        const filePath = path.join(this.UPLOAD_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            logger.warn(`File not found on disk: ${filename} (resolved path: ${filePath}), requested by user ${userId}, but DB record exists.`);
            throw new ApiError(404, 'File not found on disk despite DB record');
        }

        return filePath;
    }

    static getStorageType(): 'local' | 's3' {
        if (config.STORAGE_TYPE !== 'local' && config.STORAGE_TYPE !== 's3') {
            logger.error(`Unknown STORAGE_TYPE: ${config.STORAGE_TYPE}`);
            throw new ApiError(500, 'Server storage configuration error');
        }
        return config.STORAGE_TYPE;
    }
}
