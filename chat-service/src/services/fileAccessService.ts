import path from 'path';
import fs from 'fs';
import { logger } from '../utils';
import config from '../config/config';
import Message, { IMessage } from '../database/models/MessageModel';
import { ApiError } from '../utils/apiError';

export class FileAccessService {
    private static readonly UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads', 'temp'); // Adjusted to match typical project structure if src is in chat-service/src

    // Existing validation, can be kept for initial checks or removed if sanitizeFilename is comprehensive
    static validateFilenameBasic(filename: string): boolean {
        return !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
    }

    static sanitizeFilename(filename: string): string {
        const originalBasename = path.basename(filename);
        // Replace characters not alphanumeric, dots, or hyphens. Allow underscores as they are common.
        const sanitized = originalBasename.replace(/[^a-zA-Z0-9._-]/g, ''); // Allowed underscore

        // As per subtask requirements: throw if empty OR different from original basename
        if (!sanitized) {
            logger.error(`Sanitization of "${originalBasename}" (from "${filename}") resulted in an empty string.`);
            throw new ApiError(400, 'Invalid filename: sanitization resulted in empty name.');
        }
        
        // If the basename itself contained invalid characters that were removed,
        // or if it was something like '..', path.basename would handle it, 
        // but this check ensures the name post-regex-replacement is identical to the original basename.
        // This is a very strict interpretation.
        if (sanitized !== originalBasename) {
            logger.warn(`Original filename basename "${originalBasename}" (from "${filename}") was sanitized to "${sanitized}". This indicates invalid characters were present or an attempt to use a non-standard name.`);
            throw new ApiError(400, `Invalid filename: contains invalid characters or is potentially malicious. Original basename: ${originalBasename}, Sanitized: ${sanitized}`);
        }
        
        return sanitized;
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
