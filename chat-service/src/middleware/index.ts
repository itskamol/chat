import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import jwt from "jsonwebtoken";
import multer from "multer"; // Import multer to check for MulterError instance
import { ApiError } from "../utils";
import config from "../config/config";

export interface TokenPayload {
    id: string;
    name: string;
    email: string;
    iat: number;
    exp: number;
}

export interface IUser {
    _id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthRequest extends Request {
    user: IUser;
}

const jwtSecret = config.JWT_SECRET as string;

const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new ApiError(401, "Missing authorization header"));
    }

    const [, token] = authHeader.split(" ");
    try {
        const decoded = jwt.verify(token, jwtSecret) as TokenPayload;

        req.user = {
            _id: decoded.id,
            email: decoded.email,
            createdAt: new Date(decoded.iat * 1000),
            updatedAt: new Date(decoded.exp * 1000),
            name: decoded.name,
            password: "",
        };
        return next();
    } catch (error) {
        console.error(error); // Keep this for server-side logging of JWT errors
        return next(new ApiError(401, "Invalid or expired token")); // More specific message
    }
};

const errorConverter: ErrorRequestHandler = (err, req, res, next) => {
    let error = err;
    // Handle Multer errors
    if (err instanceof multer.MulterError) {
        let statusCode = 400;
        let message = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') {
            statusCode = 413; // Payload Too Large
            message = `File too large. Max size: ${config.maxFileSizeBytes / (1024 * 1024)}MB`;
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field. Please use "mediaFile" field for uploads.';
        }
        // For other multer errors, use default message and status 400
        error = new ApiError(statusCode, message, true, err.stack);
    } 
    // Handle custom errors (like from fileFilter or no file uploaded)
    // @ts-ignore
    else if (err.code === 'INVALID_FILE_TYPE') {
    // @ts-ignore
        error = new ApiError(415, err.message || 'Unsupported file type.', true, err.stack);
    } 
    // @ts-ignore
    else if (err.code === 'NO_FILE_UPLOADED') {
    // @ts-ignore
        error = new ApiError(400, err.message || 'No file was uploaded.', true, err.stack);
    }
    // Handle other errors that are not ApiError instances
    else if (!(error instanceof ApiError)) {
        const statusCode =
            // @ts-ignore
            error.statusCode || 500; 
        const message =
            // @ts-ignore
            error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, false, err.stack); // Mark as not operational for generic errors
    }
    next(error);
};

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    let { statusCode, message } = err;
    if (process.env.NODE_ENV === "production" && !err.isOperational) {
        statusCode = 500; // Internal Server Error
        message = "Internal Server Error";
    }

    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    };

    if (process.env.NODE_ENV === "development") {
        console.error(err);
    }

    res.status(statusCode).json(response);
    next();
};

export { authMiddleware, errorConverter, errorHandler };