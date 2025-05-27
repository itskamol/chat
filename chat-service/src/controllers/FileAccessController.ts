import { Response } from 'express';
import { FileAccessService } from '../services/fileAccessService';
import { logger } from '../utils';
import { ApiError } from '../utils/apiError';
import type { AuthRequest } from '../types/message.types';

export class FileAccessController {
    static async serveFile(req: AuthRequest, res: Response): Promise<void> {
        const { filename } = req.params;
        const userId = req.user?._id;

        try {
            // Validate user authentication
            if (!userId) {
                throw new ApiError(401, 'User not authenticated');
            }

            // Validate filename
            if (!FileAccessService.validateFilename(filename)) {
                logger.warn(`Attempt to access potentially malicious path by user ${userId}: ${filename}`);
                throw new ApiError(400, 'Invalid filename');
            }

            // Validate user access to file
            await FileAccessService.validateUserAccess(userId, filename);

            // Check storage type
            const storageType = FileAccessService.getStorageType();

            if (storageType === 'local') {
                const filePath = await FileAccessService.getLocalFilePath(filename, userId);
                console.log(`Serving file from local storage: ${filePath}`);
                res.sendFile(filePath, (err: any) => {
                    if (err) {
                        logger.error(`Error sending file ${filename} to user ${userId}:`, err);
                        if (!res.headersSent) {
                            if (err.status === 404) {
                                res.status(404).json({ error: 'File not found on disk' });
                            } else {
                                res.status(500).json({ error: 'Error sending file' });
                            }
                        }
                    } else {
                        logger.info(`Sent file: ${filename} to user ${userId}`);
                    }
                });
            } else {
                // S3 storage handling
                logger.info(`File ${filename} requested by user ${userId} is on S3. Client should use S3 URL directly`);
                throw new ApiError(400, 'File is stored on S3. Access via provided fileUrl');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                logger.error(`Unexpected error serving file ${filename} to user ${userId}:`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}
