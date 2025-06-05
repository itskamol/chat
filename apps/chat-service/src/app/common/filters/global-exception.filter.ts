import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      const message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any)?.message || exception.message;

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message,
        error: exception.name,
      };
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        method,
        message: this.extractValidationMessages(exception),
        error: 'ValidationError',
      };
    }

    // Handle MongoDB/Database errors
    if (this.isDatabaseError(exception)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        method,
        message: 'Database operation failed',
        error: 'DatabaseError',
      };
    }

    // Handle JWT errors
    if (this.isJwtError(exception)) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        timestamp,
        path,
        method,
        message: 'Authentication failed',
        error: 'JwtError',
      };
    }

    // Default error response
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Internal server error',
      error: 'InternalServerError',
      stack: process.env.NODE_ENV === 'development' ? (exception as Error)?.stack : undefined,
    };
  }

  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    const { statusCode, message, error } = errorResponse;
    const { method, url, ip, headers } = request;
    
    const logContext = {
      statusCode,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      message,
      error,
      timestamp: errorResponse.timestamp,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${statusCode} - ${message}`,
        (exception as Error)?.stack,
        JSON.stringify(logContext),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${url} - ${statusCode} - ${message}`,
        JSON.stringify(logContext),
      );
    }
  }

  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'ValidationError' ||
        exception.message.includes('validation failed'))
    );
  }

  private extractValidationMessages(exception: unknown): string[] {
    if (exception instanceof Error) {
      // Handle class-validator errors
      if ((exception as any).response?.message) {
        const messages = (exception as any).response.message;
        return Array.isArray(messages) ? messages : [messages];
      }
      
      return [exception.message];
    }
    
    return ['Validation failed'];
  }

  private isDatabaseError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name.includes('Mongo') ||
        exception.name.includes('Database') ||
        exception.message.includes('database') ||
        exception.message.includes('connection'))
    );
  }

  private isJwtError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'JsonWebTokenError' ||
        exception.name === 'TokenExpiredError' ||
        exception.name === 'NotBeforeError')
    );
  }
}
