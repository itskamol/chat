import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // This service primarily provides gRPC endpoints for file operations.
  // HTTP controller might only be for health checks or specific management APIs.
  @Get('health')
  getHealth(): string {
    return this.appService.getHealth();
  }

  // FR-FS-001: Handle file uploads and downloads. (Primarily via gRPC pre-signed URLs)
  // FR-FS-003: Provide gRPC endpoints for:
  //   FR-FS-003.1: Generating pre-signed URLs for uploads.
  //   FR-FS-003.2: Generating pre-signed URLs for downloads.
  //   FR-FS-003.3: Recording file upload completion and metadata.
  //   FR-FS-003.4: Deleting files (and their metadata).
  // These will be implemented as gRPC methods in AppService or a dedicated gRPC controller.
}
