/**
 * @file uploadMiddleware.ts
 * @description Configures Multer middleware for handling file uploads within the chat-service.
 * Since the introduction of a dedicated file-service, this middleware's role has been simplified.
 * It now primarily uses memory storage to temporarily hold the file buffer before it's sent
 * to the file-service. Validation of file types and sizes is delegated to the file-service.
 */
import multer from 'multer';
import { Request } from 'express';

/**
 * @constant storage
 * @description Configures Multer to use memory storage.
 * This means uploaded files are stored in memory as Buffer objects (req.file.buffer).
 * This approach is suitable as the file data is then immediately forwarded to the file-service
 * without needing to write to the disk on the chat-service instance.
 */
const storage = multer.memoryStorage();

/**
 * @function fileFilter
 * @description A permissive file filter for Multer.
 * In the current architecture, detailed file type and content validation is the responsibility
 * of the dedicated file-service. This filter in chat-service is intentionally basic,
 * allowing most file uploads to pass through to the FileController, which then uses
 * the fileServiceClient to interact with the file-service.
 * If specific early-stage rejections were needed in chat-service (e.g., for obviously
 * problematic files before hitting file-service), this filter could be made more stringent.
 * @param {Request} req - The Express request object.
 * @param {Express.Multer.File} file - The file object processed by Multer.
 * @param {multer.FileFilterCallback} cb - The callback to inform Multer whether to accept or reject the file.
 */
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Currently, all files are passed through. Validation is delegated to the file-service.
    // Example of a more restrictive check (though not used now):
    // if (file.mimetype.startsWith('image/')) {
    //     cb(null, true); // Accept only images
    // } else {
    //     cb(new Error('Only image files are allowed!'), false); // Reject other types
    // }
    cb(null, true); 
};

/**
 * @constant upload
 * @description The configured Multer instance exported for use in routes.
 * - `storage`: Uses the defined memoryStorage.
 * - `fileFilter`: Uses the defined permissive fileFilter.
 * - `limits`:
 *     - `fileSize`: File size limits are intentionally NOT set here. Size validation is delegated to the file-service.
 *                   If a very basic, large limit were desired here to prevent extremely large uploads from consuming
 *                   chat-service memory, it could be added, but file-service provides the canonical validation.
 *     - `files`: Limits the number of files in a single upload request to 1. This is specific to the
 *                current design of the '/upload' route (e.g., `upload.single('mediaFile')`).
 */
const upload = multer({
    storage: storage, 
    fileFilter: fileFilter, 
    limits: {
        // fileSize: 50 * 1024 * 1024, // Example: A very generous limit like 50MB if needed, but primary validation is in file-service.
        files: 1, 
    },
});

export default upload;
