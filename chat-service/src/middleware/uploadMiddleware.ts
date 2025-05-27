import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ApiError } from '../utils/apiError';
import { FileService } from '../services/fileService';
import config from '../config/config';

const TEMP_UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads', 'temp');

// Ensure temp upload directory exists
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    },
});

// File filter using FileService validation
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (FileService.validateFileType(file.mimetype)) {
        cb(null, true);
    } else {
        const error: any = new Error('Unsupported file type');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.maxFileSizeBytes || 10 * 1024 * 1024, // Default 10MB if not configured
        files: 1,
    },
});

export default upload;
