import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { PicksModule } from './picks/picks.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // 전역 Rate Limiting: 같은 IP가 60초에 100회 초과 요청하면 429.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    PicksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard를 전역 가드로 등록 → 모든 라우트에 자동 적용.
    // e2e 테스트에서는 rate limit이 테스트를 흔들지 않도록 등록하지 않는다.
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [{ provide: APP_GUARD, useClass: ThrottlerGuard }]),
  ],
})
export class AppModule {}
