import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WebSocketExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WebSocketExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    
    const errorResponse = this.buildErrorResponse(exception);
    
    // Log the error
    this.logError(exception, client, errorResponse);

    // Send error to client
    client.emit('error', errorResponse);
  }

  private buildErrorResponse(exception: unknown) {
    const timestamp = new Date().toISOString();

    if (exception instanceof WsException) {
      return {
        event: 'error',
        message: exception.message,
        timestamp,
        type: 'WebSocketError',
      };
    }

    if (exception instanceof Error) {
      return {
        event: 'error',
        message: exception.message,
        timestamp,
        type: exception.name || 'WebSocketError',
      };
    }

    return {
      event: 'error',
      message: 'Unknown WebSocket error',
      timestamp,
      type: 'WebSocketError',
    };
  }

  private logError(exception: unknown, client: Socket, errorResponse: any): void {
    const { message, type } = errorResponse;
    
    const logContext = {
      socketId: client.id,
      userId: (client as any).user?.id,
      message,
      type,
      timestamp: errorResponse.timestamp,
    };

    this.logger.error(
      `WebSocket Error - ${type}: ${message}`,
      (exception as Error)?.stack,
      JSON.stringify(logContext),
    );
  }
}
