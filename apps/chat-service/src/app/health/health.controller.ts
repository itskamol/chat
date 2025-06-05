import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: 'Get service health status' })
    @ApiResponse({
        status: 200,
        description: 'Health check successful',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                info: { type: 'object' },
                error: { type: 'object' },
                details: { type: 'object' },
            },
        },
    })
    @ApiResponse({
        status: 503,
        description: 'Health check failed',
    })
    async check() {
        return this.healthService.check();
    }

    @Get('detailed')
    @ApiOperation({ summary: 'Get detailed health information' })
    @ApiResponse({
        status: 200,
        description: 'Detailed health information retrieved successfully',
    })
    async getDetailedHealth() {
        return this.healthService.getDetailedHealthInfo();
    }
}
