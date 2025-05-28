/**
 * @file errorHandler.ts
 * @description Defines a global error handling middleware for the Express application.
 * This middleware catches errors passed via `next(error)` and sends a standardized JSON error response.
 */
import { Request, Response, NextFunction } from 'express';

/**
 * @interface AppError
 * @extends Error
 * @description Custom error interface that includes an optional `statusCode` property.
 * This allows controllers and services to specify the HTTP status code for an error.
 */
interface AppError extends Error {
  statusCode?: number;
}

/**
 * @function errorHandler
 * @description Global error handling middleware for Express.
 * It logs the error and sends a JSON response with a status code and message.
 * If headers have already been sent, it delegates to the default Express error handler.
 * @param {AppError} err - The error object. Can be a standard Error or an AppError with a statusCode.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  // If headers have already been sent to the client,
  // it's too late to send a new response, so delegate to the default Express error handler
  // which will typically terminate the connection.
  if (res.headersSent) {
    return next(err);
  }

  // Log the error for debugging purposes.
  // In a production environment, consider using a more sophisticated logging library
  // that can output to various destinations and include more context.
  console.error(`[ErrorHandler] Unhandled error: ${err.message}`, err.stack);

  // Determine the status code: use the statusCode from the error if available, otherwise default to 500.
  const statusCode = err.statusCode || 500;
  // Determine the message: use the message from the error if available, otherwise provide a generic message.
  const message = err.message || 'Internal Server Error';

  // Send a standardized JSON error response.
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};
