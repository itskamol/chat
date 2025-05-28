import fs from 'fs';
import { uploadFileToS3 } from './s3Service';
import { env } from '../config/env';
import { logger } from '../utils';
import type { FileUploadResult } from '../types/message.types';

export class FileService {
    private static allowedTypes = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/webm', 'video/ogg'],
        audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'],
        file: ['application/pdf', 'text/plain']
    };
    static validateFileType(mimetype: string): boolean {
        console.log('FileService initialized with allowed types:', mimetype);
        return Object.values(this.allowedTypes).flat().includes(mimetype);
    }

    static getMessageType(mimetype: string): 'image' | 'video' | 'audio' | 'file' {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'file';
    }

    static async uploadFile(file: Express.Multer.File): Promise<FileUploadResult> {
        if (env.STORAGE_TYPE === 's3') {
            if (!file.path) {
                throw new Error('Temporary file path missing for S3 upload.');
            }

            try {
                const fileBuffer = fs.readFileSync(file.path);
                const s3UploadResult = await uploadFileToS3(
                    fileBuffer,
                    file.originalname,
                    file.mimetype
                );

                // Cleanup temp file
                try {
                    fs.unlinkSync(file.path);
                    logger.info(`Temporary file ${file.path} deleted after S3 upload.`);
                } catch (unlinkError) {
                    logger.error(`Error deleting temporary file ${file.path}:`, unlinkError);
                }

                return {
                    fileUrl: s3UploadResult.location,
                    s3Key: s3UploadResult.key
                };
            } catch (error) {
                logger.error('S3 upload failed:', error);
                throw error;
            }
        }

        // Local storage
        return {
            fileUrl: `/media/${file.filename}`,
            s3Key: undefined
        };
    }

    static async cleanupFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`File cleaned up: ${filePath}`);
            }
        } catch (error) {
            logger.error(`Failed to cleanup file ${filePath}:`, error);
        }
    }
}
