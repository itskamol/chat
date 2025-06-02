import { Controller, Get, All, Req, Res } from '@nestjs/common'; // Removed Post
import { AppService } from './app.service';
import { Request, Response } from 'express'; // Import Request and Response

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // FR-GW-001: Single entry point for all client (HTTP/WebSocket) requests.
  // FR-GW-002: Route HTTP requests to appropriate downstream microservices.
  // FR-GW-009: Provide aggregated responses by calling multiple microservices if required.
  // FR-GW-011: Log all incoming requests and their corresponding upstream service calls.
  @All('api/*') // Catch-all for API routes
  async proxyApiRequests(@Req() req: Request, @Res() res: Response) {
    // Placeholder for routing logic to downstream services (gRPC/REST)
    // Authentication (FR-GW-004) and Authorization (FR-GW-005) should be handled by middleware/guards
    // Request/Response transformation (FR-GW-007) might happen here or in service
    // Logging (FR-GW-011) will be implemented via interceptors/middleware
    return this.appService.routeRequest(req, res);
  }

  // FR-GW-003: Manage WebSocket connections for real-time communication.
  // (WebSocket gateway setup will be in a separate @WebSocketGateway() class, not typically in a REST controller)
  // Placeholder comment for WebSocket related logic:
  // - Authenticate WebSocket connections (FR-GW-003.1)
  // - Route WebSocket messages/events (FR-GW-003.2)

  // FR-GW-006: Provide rate limiting capabilities (typically handled by middleware).
  // FR-GW-008: Handle API versioning (can be done via path, headers, or specific module).
  // FR-GW-010: Provide standard CORS handling (typically handled by NestJS app.enableCors()).

  @Get('health')
  healthCheck(): string {
    return this.appService.getHealth();
  }
}
