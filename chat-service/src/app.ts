import express, { Express, Request, Response } from "express";
import morgan from "morgan";
import path from 'path'; // Added path module
import fs from 'fs'; // Added fs module
import messageRoutes from "./routes/messageRoutes"; // Renamed userRouter to messageRoutes for clarity
import { errorConverter, errorHandler } from "./middleware";
import { logger } from "./utils";

const app: Express = express();

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            // Use your logger instance here if you want to log with winston
            // For now, just console.log to match previous behavior
            console.log(message.trim());
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { authMiddleware, AuthRequest } from "./middleware"; // Import AuthRequest
import Message from './database/models/MessageModel'; // Import Message model
import config from "./config/config"; // Import config to check STORAGE_TYPE

// Message routes
app.use(messageRoutes); 

// Static file serving route for uploaded media - NOW WITH AUTH
const UPLOAD_DIR = path.join(__dirname, '../uploads');
app.get('/media/:filename', 
    // @ts-ignore // Apply auth middleware
    authMiddleware, 
    async (req: AuthRequest, res: Response) => {
        const { filename } = req.params;
        // @ts-ignore
        const userId = req.user?._id;

        if (!userId) {
            // This should ideally be caught by authMiddleware, but as a safeguard
            return res.status(401).json({ error: 'User not authenticated.' });
        }

        // Basic path sanitization
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            logger.warn(`Attempt to access potentially malicious path by user ${userId}: ${filename}`);
            return res.status(400).json({ error: 'Invalid filename.' });
        }

        try {
            // Find the message by storedFileName (if local storage) or by matching part of fileUrl (less ideal)
            // This query assumes local storage. For S3, direct URL access is typical, or pre-signed URLs.
            const message = await Message.findOne({ storedFileName: filename });

            if (!message) {
                logger.warn(`File metadata not found in DB for filename: ${filename}, requested by user ${userId}`);
                return res.status(404).json({ error: 'File not found or metadata missing.' });
            }

            // Authorization check: User must be sender or receiver
            // TODO: Extend this for group chats if applicable (check if user is part of message.chatId participants)
            const isSender = message.senderId === userId.toString();
            const isReceiver = message.receiverId === userId.toString();

            if (!isSender && !isReceiver) {
                logger.warn(`Unauthorized attempt to access file ${filename} by user ${userId}. Sender: ${message.senderId}, Receiver: ${message.receiverId}`);
                return res.status(403).json({ error: 'Forbidden. You do not have access to this file.' });
            }
            
            // Construct file path only if local storage is used and authorized
            if (config.STORAGE_TYPE === 'local') {
                const filePath = path.join(UPLOAD_DIR, filename);
                if (fs.existsSync(filePath)) {
                    res.sendFile(filePath, (err) => {
                        if (err) {
                            logger.error(`Error sending file ${filename} to user ${userId}:`, err);
                            // @ts-ignore
                            if (!res.headersSent) {
                                // @ts-ignore
                                if (err.status === 404) { 
                                    res.status(404).json({ error: 'File not found on disk.' });
                                } else {
                                    res.status(500).json({ error: 'Error sending file.' });
                                }
                            }
                        } else {
                            logger.info(`Sent file: ${filename} to user ${userId}`);
                        }
                    });
                } else {
                    logger.warn(`File not found on disk: ${filename} (resolved path: ${filePath}), requested by user ${userId}, but DB record exists.`);
                    res.status(404).json({ error: 'File not found on disk despite DB record.' });
                }
            } else if (config.STORAGE_TYPE === 's3') {
                // For S3, the fileUrl in the message is the direct S3 URL.
                // The client should fetch from this URL. This route is not for proxying S3 files.
                // If pre-signed URLs were used, this route might generate and redirect to one.
                // For now, if storage is S3, this route shouldn't be hit for S3 files.
                logger.info(`File ${filename} requested by user ${userId} is on S3. Client should use S3 URL: ${message.fileUrl}`);
                return res.status(400).json({ error: 'File is stored on S3. Access via provided fileUrl.' });
            } else {
                logger.error(`Unknown STORAGE_TYPE: ${config.STORAGE_TYPE}`);
                return res.status(500).json({ error: 'Server storage configuration error.' });
            }

        } catch (dbError) {
            logger.error(`Database error while trying to authorize file access for ${filename}, user ${userId}:`, dbError);
            res.status(500).json({ error: 'Server error while authorizing file access.' });
        }
    }
);

// Error handling middleware should be last
app.use(errorConverter);
app.use(errorHandler);

export default app;