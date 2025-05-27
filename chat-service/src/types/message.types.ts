import { Request } from "express";
import { IUser } from "../middleware";

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface FileUploadOptions {
    file: Express.Multer.File; // This is still relevant as multer provides req.file
    senderId: string;
    receiverId: string;
    chatId?: string;
    originalMessage?: string; // Caption for the file
}

// FileUploadResult is likely obsolete as FileController now directly uses
// FileServiceUploadResponse from 'fileServiceClient.ts' and maps it to the Message model.
// export interface FileUploadResult {
//     fileUrl: string;
//     s3Key?: string; // Corresponds to 'key' from file-service
// }

// AllowedFileTypes is obsolete as file type validation is now handled by the file-service.
// export interface AllowedFileTypes {
//     image: string[];
//     video: string[];
//     audio: string[];
//     file: string[];
// }

export interface AuthRequest extends Request {
    user?: IUser;
}
