import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // This service primarily processes events and provides gRPC endpoints.
  // HTTP controller might only be for health checks or specific management APIs.
  @Get('health')
  getHealth(): string {
    return this.appService.getHealth();
  }

  // FR-PS-003: Consume user connect/disconnect events from the API Gateway (WebSocket lifecycle).
  // This will likely be handled by subscribing to RabbitMQ topics or via a dedicated gRPC endpoint
  // called by the API Gateway when WebSocket connections open/close.
  // Example: @EventPattern('user.connected') or @GrpcMethod(...)

  // FR-PS-004: Provide gRPC endpoints for other services to query user presence status.
  // These will be implemented as gRPC methods in AppService or a dedicated gRPC controller.

  // FR-PS-005: Broadcast presence updates via the API Gateway's WebSocket connections.
  // This service will publish events (e.g., to RabbitMQ) that the API Gateway subscribes to
  // and then relays to relevant clients over WebSockets.
}
