import { Request, Response, NextFunction } from 'express';
import * as fileService from '../services/fileService';
// For simplicity, we'll use a basic error structure.
// In a larger app, a custom ApiError class would be better.
// interface ApiError extends Error { // Example of a more structured error
//   statusCode: number;
// }

/**
 * @function uploadFileController
 * @description Express controller to handle file uploads. It expects a file in `req.file` (from multer).
 * It calls the `fileService.uploadFile` to process and store the file, then returns metadata about the uploaded file.
 * @param {Request} req - Express request object. `req.file` is expected to be populated by multer.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const uploadFileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if a file was provided in the request
    if (!req.file) {
      // return next({ statusCode: 400, message: 'No file uploaded.' } as ApiError);
      const error = new Error('No file uploaded.');
      (error as any).statusCode = 400;
      return next(error);
    }

    console.log(`[FileController] Received file for upload: ${req.file.originalname}`);
    const fileData = await fileService.uploadFile(req.file);
    console.log(`[FileController] File uploaded successfully. Key: ${fileData.key}`);
    res.status(201).json(fileData);
  } catch (error) {
    console.error(`[FileController] Error in uploadFileController: ${error}`);
    // Pass any caught errors to the global error handler
    next(error);
  }
};

/**
 * @function getFileController
 * @description Express controller to handle file retrieval. It expects an S3 object 'key' as a URL parameter.
 * It fetches file metadata and then streams the file from S3 to the client.
 * Sets appropriate `Content-Type`, `Content-Length`, and `Content-Disposition` headers.
 * @param {Request} req - Express request object, `req.params.key` is the S3 object key.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const getFileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    // Validate that the key parameter is present
    if (!key) {
      const error = new Error('File key is required.');
      (error as any).statusCode = 400;
      return next(error);
    }

    console.log(`[FileController] Request to get file with key: ${key}`);

    // 1. Get file metadata from S3
    const metadata = await fileService.getFileMetadata(key);
    const contentType = metadata.ContentType || 'application/octet-stream';
    const contentLength = metadata.ContentLength;
    // S3 metadata keys are stored in lowercase.
    const originalName = metadata.Metadata?.originalfilename || key;

    console.log(`[FileController] Metadata for key ${key}: ContentType: ${contentType}, ContentLength: ${contentLength}, OriginalName: ${originalName}`);

    // 2. Set response headers
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }
    // Use 'inline' to display in browser if possible, 'attachment' to force download
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`); 

    // 3. Get file stream and pipe to response
    const stream = await fileService.getFileInputStream(key);
    console.log(`[FileController] Piping stream for key: ${key} to response.`);
    
    stream.on('error', (streamError) => {
        console.error(`[FileController] Stream error for key ${key}:`, streamError);
        // If headers are not yet sent, we can send an error response.
        // Otherwise, the connection might just be terminated.
        if (!res.headersSent) {
            // It's tricky to send a new error response if the stream has already started piping
            // and potentially sent some data or headers.
            // next(streamError) might not work as expected here.
            res.status(500).send({ message: "Error streaming file."});
        } else {
            // If headers are sent, we can only try to end the response or destroy the stream.
            // The client might receive a partial file.
            stream.destroy(); 
        }
    });

    stream.pipe(res);

  } catch (error) {
    console.error(`[FileController] Error in getFileController for key ${req.params.key}: ${error}`);
    // Check if the error is an S3 'NoSuchKey' error
    if ((error as any).name === 'NoSuchKey' || (error as any).$metadata?.httpStatusCode === 404) {
        const notFoundError = new Error('File not found.');
        (notFoundError as any).statusCode = 404;
        return next(notFoundError);
    }
    // Pass any caught errors to the global error handler, checking for S3 'NoSuchKey' specifically
    next(error);
  }
};

/**
 * @function deleteFileController
 * @description Express controller to handle file deletion. It expects an S3 object 'key' as a URL parameter.
 * It calls `fileService.deleteFile` to remove the file from S3.
 * @param {Request} req - Express request object, `req.params.key` is the S3 object key.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const deleteFileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    // Validate that the key parameter is present
    if (!key) {
      const error = new Error('File key is required for deletion.');
      (error as any).statusCode = 400;
      return next(error);
    }
    console.log(`[FileController] Request to delete file with key: ${key}`);
    await fileService.deleteFile(key);
    console.log(`[FileController] File deleted successfully. Key: ${key}`);
    res.status(200).json({ message: 'File deleted successfully', key });
  } catch (error) {
    console.error(`[FileController] Error in deleteFileController for key ${req.params.key}: ${error}`);
     if ((error as any).name === 'NoSuchKey' || (error as any).$metadata?.httpStatusCode === 404) {
        const notFoundError = new Error('File not found, cannot delete.');
        (notFoundError as any).statusCode = 404;
        return next(notFoundError);
    }
    next(error);
  }
};
