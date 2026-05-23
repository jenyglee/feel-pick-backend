import { Module } from '@nestjs/common';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  // TerminusModule은 PrismaHealthIndicator를 자동 제공하지 않으므로 직접 등록.
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
