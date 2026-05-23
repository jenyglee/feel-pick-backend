import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { execSync } from 'node:child_process';
import * as dotenv from 'dotenv';

/**
 * jest globalSetup — e2e 테스트 시작 전 1회 실행.
 * 1) .env.test 로드 (이미 설정된 env는 덮지 않음 → CI에서는 CI 값 우선)
 * 2) 테스트 데이터베이스 생성 (없으면)
 * 3) 마이그레이션 적용
 */
export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: '.env.test' });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set for e2e tests');
  }

  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, '');

  // 1) 데이터베이스가 없으면 만든다 (database 미지정으로 서버에만 접속).
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    allowPublicKeyRetrieval: true,
  });
  const conn = await adapter.connect();
  await conn.executeRaw({
    sql: `CREATE DATABASE IF NOT EXISTS \`${database}\``,
    args: [],
    argTypes: [],
  });
  await conn.dispose();

  // 2) 테스트 DB에 마이그레이션 적용.
  // prisma.config.ts가 env('DATABASE_URL')를 읽으므로, 자식 프로세스에
  // 테스트 DB URL을 주입한다. (prisma.config.ts의 dotenv는 이미 설정된 값을 덮지 않음)
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
