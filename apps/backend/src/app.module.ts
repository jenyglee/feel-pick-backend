import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChoiceModule } from './choice/choice.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // 구조화 로깅(JSON). 개발에선 pino-pretty로 사람이 읽기 좋게 출력.
    LoggerModule.forRoot({
      pinoHttp: {
        // 테스트에선 로그를 꺼 출력을 깔끔하게, 운영은 info, 개발은 debug.
        level: isTest ? 'silent' : isProd ? 'info' : 'debug',
        // 보안: Authorization 헤더(JWT)는 로그에서 가린다.
        redact: ['req.headers.authorization'],
        // 헬스 체크 요청은 너무 잦아 로그에서 제외.
        autoLogging: { ignore: (req) => req.url === '/health' },
        transport:
          isProd || isTest
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    // 전역 Rate Limiting: 같은 IP가 60초에 100회 초과 요청하면 429.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChoiceModule,
    HealthModule,
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
