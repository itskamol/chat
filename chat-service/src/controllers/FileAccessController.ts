import { Response } from 'express';
import { FileAccessService } from '../services/fileAccessService';
import { logger } from '../utils';
import { ApiError } from '../utils/apiError';
import type { AuthRequest } from '../types/message.types';

export class FileAccessController {
    static async serveFile(req: AuthRequest, res: Response): Promise<void> {
        const originalFilename = req.params.filename; // Renamed for clarity
        const userId = req.user?._id;

        try {
            // Validate user authentication
            if (!userId) {
                throw new ApiError(401, 'User not authenticated');
            }

            // Sanitize filename
            const sanitizedFilename = FileAccessService.sanitizeFilename(originalFilename);
            // The sanitizeFilename method will log or throw an error if malicious patterns are detected.
            // If it throws, the catch block below will handle it.
            // If it logs and returns, we proceed with the sanitized name.

            // Basic check (optional, as sanitizeFilename is more robust)
            // if (!FileAccessService.validateFilenameBasic(sanitizedFilename)) {
            //     logger.warn(`Attempt to access potentially malicious path by user ${userId} after sanitization: ${sanitizedFilename} (original: ${originalFilename})`);
            //     throw new ApiError(400, 'Invalid filename after basic validation');
            // }

            // Validate user access to file using the sanitized filename
            await FileAccessService.validateUserAccess(userId, sanitizedFilename);

            // Check storage type
            const storageType = FileAccessService.getStorageType();

            if (storageType === 'local') {
                const filePath = await FileAccessService.getLocalFilePath(sanitizedFilename, userId);
                console.log(`Serving file from local storage: ${filePath}`);
                res.sendFile(filePath, (err: any) => {
                    if (err) {
                        logger.error(`Error sending file ${sanitizedFilename} (original: ${originalFilename}) to user ${userId}:`, err);
                        if (!res.headersSent) {
                            if (err.status === 404) {
                                res.status(404).json({ error: 'File not found on disk' });
                            } else {
                                res.status(500).json({ error: 'Error sending file' });
                            }
                        }
                    } else {
                        logger.info(`Sent file: ${sanitizedFilename} (original: ${originalFilename}) to user ${userId}`);
                    }
                });
            } else {
                // S3 storage handling
                logger.info(`File ${sanitizedFilename} (original: ${originalFilename}) requested by user ${userId} is on S3. Client should use S3 URL directly`);
                throw new ApiError(400, 'File is stored on S3. Access via provided fileUrl');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                logger.error(`Unexpected error serving file ${originalFilename} to user ${userId}:`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}
