import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}
  //

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness/readiness check (app + DB)' })
  check() {
    // DB에 가벼운 쿼리를 날려 실제 연결까지 살아있는지 확인한다.
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }
}
