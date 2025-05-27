/**
 * @file multerConfig.ts
 * @description Configures the Multer middleware for handling file uploads.
 * This includes setting up storage (memory storage), file filtering based on MIME types,
 * and defining file size limits.
 */
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { config } from '../config/config';

/**
 * File filter function for Multer.
 * Validates the file's MIME type against the allowed types from config.
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  if (config.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true); // Accept file
  } else {
    callback(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${config.ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

/**
 * @constant upload
 * @description Configured Multer instance.
 * - `storage`: Uses `multer.memoryStorage()` to store files as Buffers in memory. This is suitable for passing to S3 without disk I/O.
 * - `fileFilter`: Custom function to validate file types based on `config.ALLOWED_MIME_TYPES`.
 * - `limits`: Sets file size limits based on `config.MAX_FILE_SIZE_MB`.
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as Buffers, suitable for forwarding to S3.
  fileFilter: fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

export default upload;
