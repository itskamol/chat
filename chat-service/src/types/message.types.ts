import { Request } from "express";
import { IUser } from "../middleware";

export interface FileUploadOptions {
    file: Express.Multer.File;
    senderId: string;
    receiverId: string;
    chatId?: string;
    originalMessage?: string;
}

export interface FileUploadResult {
    fileUrl: string;
    s3Key?: string;
}

export interface AllowedFileTypes {
    image: string[];
    video: string[];
    audio: string[];
    file: string[];
}

export interface AuthRequest extends Request {
    user?: IUser;
}
