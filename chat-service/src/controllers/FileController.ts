import { Request, Response, NextFunction } from 'express';
import Message from '../database/models/MessageModel';
import { logger } from '../utils';
import { ApiError } from '../utils/apiError';
import type { AuthRequest } from '../types/message.types';
import { uploadFileToService, FileServiceUploadResponse } from '../clients/fileServiceClient'; // Import the new client
import { FileService } from '../services/fileService'; // Used for its static getMessageType method

/**
 * @class FileController
 * @description Handles HTTP requests related to file operations in the chat-service.
 * Currently, its primary responsibility is to manage file uploads by coordinating
 * with the external `file-service` and then creating corresponding message entries.
 */
export default class FileController {
    /**
     * @static
     * @async
     * @function uploadFile
     * @description Express controller method to handle file uploads for chat messages.
     * It expects a file in `req.file` (processed by Multer middleware using memory storage).
     * The method performs the following steps:
     * 1. Validates user authentication and required request body parameters (receiverId).
     * 2. Extracts the file buffer, original name, and MIME type from `req.file`.
     * 3. Calls `uploadFileToService` (from `fileServiceClient`) to upload the file to the dedicated `file-service`.
     * 4. Receives metadata about the uploaded file from `file-service` (URL, S3 key, type, size, etc.).
     * 5. Uses `FileService.getMessageType` to determine the chat-specific message type (e.g., 'image', 'video').
     * 6. Creates a new `Message` document in MongoDB with details of the uploaded file and associated chat information.
     * 7. Responds to the client with the created message object (201 Created).
     * All errors are caught and passed to the global error handler via `next()`.
     *
     * @param {AuthRequest} req - Express request object, augmented with `user` property from auth middleware.
     *                            `req.file` is populated by Multer. `req.body` contains `receiverId`, `chatId` (optional),
     *                            and `originalMessage` (optional caption).
     * @param {Response} res - Express response object.
     * @param {NextFunction} next - Express next middleware function.
     */
    static async uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const senderId = req.user?._id; // Authenticated user's ID

            if (!senderId) {
                return next(new ApiError(401, 'User authentication required.'));
            }

            const { receiverId, chatId, originalMessage } = req.body;

            if (!receiverId) {
                return next(new ApiError(400, 'Receiver ID is required.'));
            }

            if (!req.file) {
                return next(new ApiError(400, 'File is required for upload.'));
            }

            const fileBuffer = req.file.buffer;
            const originalName = req.file.originalname;
            const mimeType = req.file.mimetype;

            logger.info(`[FileController] Received file for upload: ${originalName}, type: ${mimeType}, size: ${fileBuffer.length} bytes. Forwarding to file-service.`);

            // Call the fileServiceClient to upload the file to the dedicated file-service
            const fileServiceResponse: FileServiceUploadResponse = await uploadFileToService(
                fileBuffer, // Raw file data
                originalName,
                mimeType
            );
            
            logger.info(`[FileController] File successfully uploaded via file-service. Key: ${fileServiceResponse.key}, URL: ${fileServiceResponse.url}`);

            // Determine the chat-specific message type (e.g., 'image', 'video')
            // based on the MIME type confirmed by the file-service.
            const messageType = FileService.getMessageType(fileServiceResponse.type);

            // Construct a new Message document for the chat
            const newMessage = new Message({
                senderId, // ID of the user sending the file
                receiverId, // ID of the recipient
                chatId,
                message: originalMessage || fileServiceResponse.originalName, // Use originalName from file-service response
                originalMessage, // Optional caption for the file
                messageType,     // 'image', 'video', 'audio', or 'file'
                fileUrl: fileServiceResponse.url, // Direct URL to the file from file-service
                fileName: fileServiceResponse.originalName, // Original name of the file, confirmed by file-service
                storedFileName: fileServiceResponse.key, // The key used by file-service (e.g., S3 object key)
                fileMimeType: fileServiceResponse.type, // MIME type confirmed by file-service
                fileSize: fileServiceResponse.size, // Size of the file in bytes, confirmed by file-service
                status: 'Delivered' // Initial status; could be 'Sent' then updated based on events
            });

            // Save the new message document to the database
            await newMessage.save();

            logger.info('[FileController] Message with file attachment saved successfully.', {
                messageId: newMessage._id,
                fileUrl: newMessage.fileUrl,
                originalFilename: newMessage.fileName
            });

            res.status(201).json(newMessage);

        } catch (error: any) {
            // No req.file.path to cleanup as Multer is configured for memoryStorage
            logger.error('[FileController] Error during file upload process:', {
                message: error.message, // Error message
                stack: error.stack,
                statusCode: error.statusCode, // If ApiError
                isApiError: error instanceof ApiError,
            });
            // Ensure the error is passed to the global error handler
            if (error instanceof ApiError) {
                return next(error);
            }
            next(new ApiError(error.statusCode || 500, error.message || 'Internal server error during file upload.'));
        }
    }
}
