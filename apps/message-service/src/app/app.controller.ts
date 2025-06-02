import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // This service is primarily gRPC based.
  // This HTTP controller might be removed or used only for health checks / management APIs.
  @Get('health')
  getHealth(): string {
    return this.appService.getHealth();
  }

  // FR-MS-002: Provide gRPC endpoints for chat-service to:
  // FR-MS-002.1: Save new messages.
  // FR-MS-002.2: Retrieve message history for a chat room (with pagination).
  // FR-MS-002.3: Update message status (e.g., read, deleted).
  // FR-MS-002.4: Search messages.
  // These will be implemented as gRPC methods in a dedicated gRPC controller or directly in AppService
  // and exposed via the NestJS microservice mechanism.
}
