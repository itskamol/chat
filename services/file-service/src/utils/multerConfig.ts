/**
 * @file multerConfig.ts
 * @description Configures the Multer middleware for handling file uploads.
 * This includes setting up storage (memory storage), file filtering based on MIME types,
 * and defining file size limits.
 */
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { config } from '../config/config';
import {
    ALLOWED_MIME_TYPES,
    validateNodeFile,
    getFileCategory,
} from '@chat/shared';

/**
 * Enhanced file filter with detailed validation
 */
const enhancedFileFilter = (
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
) => {
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return callback(new Error(`Unsupported file type: ${file.mimetype}`));
    }

    // Get file category for size validation
    const category = getFileCategory(file.mimetype);
    if (!category) {
        return callback(
            new Error(`Unable to determine file category for: ${file.mimetype}`)
        );
    }

    // Note: File size validation will be handled by multer's limits
    // Individual category size limits can be enforced in the route handler
    callback(null, true);
};

/**
 * @constant upload
 * @description Configured Multer instance with enhanced validation.
 * - `storage`: Uses `multer.memoryStorage()` to store files as Buffers in memory.
 * - `fileFilter`: Custom function using shared validation utilities.
 * - `limits`: Sets file size limits based on configuration.
 */
const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory as Buffers
    fileFilter: enhancedFileFilter, // Use enhanced validation
    limits: {
        fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
        files: 1, // Allow only one file per request
        fieldSize: 1024 * 1024, // 1MB field size limit
    },
});

/**
 * Alternative upload configuration for different file categories
 */
export const createCategorySpecificUpload = (maxSizeMB?: number) => {
    return multer({
        storage: multer.memoryStorage(),
        fileFilter: (
            req: Request,
            file: Express.Multer.File,
            callback: FileFilterCallback
        ) => {
            const category = getFileCategory(file.mimetype);
            if (!category) {
                return callback(
                    new Error(`Unsupported file type: ${file.mimetype}`)
                );
            }
            // Size will be checked by multer limits, this is just for type validation
            callback(null, true);
        },
        limits: {
            fileSize: maxSizeMB
                ? maxSizeMB * 1024 * 1024
                : config.MAX_FILE_SIZE_MB * 1024 * 1024,
            files: 1,
        },
    });
};

export default upload;
