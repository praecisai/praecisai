import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // RAILWAY DASHBOARD ACTION REQUIRED:
  // Set healthcheck path to: /api/v1/health
  // This endpoint is what Railway pings to confirm service is running
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }
}
