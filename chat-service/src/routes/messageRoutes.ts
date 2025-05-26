import { Router, Request, Response } from "express";
import MessageController from "../controllers/MessageController";
import { authMiddleware } from "../middleware";
import upload from '../middleware/uploadMiddleware'; // Import multer middleware
import Message from '../database/models/MessageModel'; // Import Message model
import { IMessage } from "../database/models/MessageModel"; // Import IMessage interface
import { logger } from "../utils"; // Import logger
// Add import for fs and s3Service at the top of the file
import fs from 'fs';
import { uploadFileToS3 } from '../services/s3Service';
import config from '../config/config';

const messageRoutes = Router();

// @ts-ignore
messageRoutes.post("/send", authMiddleware, MessageController.send); // Existing route for text messages

messageRoutes.get(
    "/get/:receiverId",
    // @ts-ignore
    authMiddleware,
    MessageController.getConversation
);


// New route for file uploads
// Assuming /v1 prefix is handled by app.ts or gateway, if not, add it here.
// For now, let's make it /messages/upload to be consistent with existing /messages/get
messageRoutes.post(
    "/upload",
    // @ts-ignore
    authMiddleware, // Ensure user is authenticated
    // Custom middleware to handle multer errors and pass them to the Express error handler
    (req: Request, res: Response, next: Function) => { // Explicitly use Function for next type
        upload.single('mediaFile')(req, res, (err: any) => {
            if (err) {
                // Pass multer errors (or any error from upload.single) to the next error handler
                return next(err); 
            }
            // If no file was uploaded by multer (but no error occurred, e.g., no file sent in form-data)
            if (!req.file) {
                // Create a custom error to indicate no file was received
                const noFileError = new Error('No file uploaded.');
                // @ts-ignore
                noFileError.code = 'NO_FILE_UPLOADED'; 
                return next(noFileError);
            }
            next();
        });
    },
    async (req: Request, res: Response, next: Function) => { // next added for error propagation
        try {
            // @ts-ignore 
            const senderId = req.user?._id || req.body.senderId; 

            // req.file should be populated by multer at this point
            if (!senderId) {
                 // This case should ideally be caught by authMiddleware or earlier validation
                 return res.status(400).json({ error: 'Sender ID is missing.' });
            }

            const { receiverId, chatId, originalMessage } = req.body;

            if (!receiverId) {
                return res.status(400).json({ error: 'Receiver ID is missing.' });
            }

            let messageType = 'file';
            if (req.file!.mimetype.startsWith('image/')) messageType = 'image';
            else if (req.file!.mimetype.startsWith('video/')) messageType = 'video';
            else if (req.file!.mimetype.startsWith('audio/')) messageType = 'audio';

            let finalFileUrl = '';
            let s3Key: string | undefined = undefined;

            if (config.STORAGE_TYPE === 's3') {
                if (!req.file!.path) {
                    logger.error('File path is missing after multer processing for S3 upload.');
                    throw new Error('Temporary file path missing for S3 upload.');
                }
                const fileBuffer = fs.readFileSync(req.file!.path);
                const s3UploadResult = await uploadFileToS3(fileBuffer, req.file!.originalname, req.file!.mimetype);
                finalFileUrl = s3UploadResult.location;
                s3Key = s3UploadResult.key;

                try {
                    fs.unlinkSync(req.file!.path);
                    logger.info(`Temporary file ${req.file!.path} deleted after S3 upload.`);
                } catch (unlinkError) {
                    logger.error(`Error deleting temporary file ${req.file!.path}:`, unlinkError);
                }
            } else {
                finalFileUrl = `/media/${req.file!.filename}`; // URL to access the file
                // For local storage, storedFileName will be the actual unique filename on disk
                s3Key = undefined; // Not using S3, so no s3Key
            }

            const newMessage = new Message({
                senderId,
                receiverId,
                chatId, 
                message: originalMessage || req.file!.originalname,
                originalMessage: originalMessage,
                messageType,
                fileUrl: finalFileUrl,
                fileName: req.file!.originalname, // Original filename for display
                storedFileName: config.STORAGE_TYPE === 'local' ? req.file!.filename : undefined, // Unique filename on disk if local
                fileMimeType: req.file!.mimetype,
                fileSize: req.file!.size,
                status: 'Sent', 
                // s3Key: s3Key, // If you decide to store S3 key directly for other operations
            });

            await newMessage.save();
            
            logger.info('File processed and message saved:', { 
                messageId: newMessage._id, 
                storageType: config.STORAGE_TYPE,
                fileUrl: finalFileUrl,
                originalFilename: req.file!.originalname 
            });

            // TODO: Emit Socket.IO event (this should be done by the controller or after successful save)
            res.status(201).json(newMessage);

        } catch (error: any) {
            // Pass any other errors (S3 upload, DB save) to the Express error handler
            logger.error(`Error in /upload route after multer (storage: ${config.STORAGE_TYPE}):`, error);
            next(error); 
        }
    }
);


export default messageRoutes;
