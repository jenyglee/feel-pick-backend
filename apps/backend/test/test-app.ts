import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface E2EContext {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * e2e용 Nest 앱 생성. configureApp으로 운영과 동일한 파이프/필터/헤더를 적용한다.
 * (rate limit은 NODE_ENV=test에서 AppModule이 전역 가드를 등록하지 않으므로 꺼져 있다)
 */
export async function createTestApp(): Promise<E2EContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** 모든 테이블 비우기. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany();
}
