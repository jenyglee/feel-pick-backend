import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

async function signup(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password: 'P@ssw0rd!', displayName: email.split('@')[0] })
    .expect(201);
  return res.body.accessToken as string;
}

function createPick(app: INestApplication, token: string) {
  return request(app.getHttpServer())
    .post('/picks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Lunch', options: ['Pizza', 'Salad'] });
}

describe('픽 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('토큰 없이 픽 생성은 401로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/picks')
      .send({ title: 'Lunch', options: ['Pizza', 'Salad'] })
      .expect(401);
  });

  it('인증된 사용자의 픽을 생성한다', async () => {
    const token = await signup(app, 'owner@example.com');
    const res = await createPick(app, token).expect(201);

    expect(res.body).toMatchObject({ title: 'Lunch' });
    expect(res.body.options).toHaveLength(2);
    expect(typeof res.body.userId).toBe('string');
  });

  it('잘못된 픽 입력은 400으로 거부한다', async () => {
    const token = await signup(app, 'owner@example.com');
    await request(app.getHttpServer())
      .post('/picks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', options: ['only-one'] })
      .expect(400);
  });

  it('픽 목록은 토큰 없이 공개 조회된다', async () => {
    const token = await signup(app, 'owner@example.com');
    await createPick(app, token).expect(201);

    const res = await request(app.getHttpServer()).get('/picks').expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('본인 픽은 삭제할 수 있다 (204)', async () => {
    const token = await signup(app, 'owner@example.com');
    const created = await createPick(app, token).expect(201);

    await request(app.getHttpServer())
      .delete(`/picks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/picks/${created.body.id}`)
      .expect(404);
  });

  it('남의 픽 삭제는 금지된다 (403)', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const created = await createPick(app, ownerToken).expect(201);

    const otherToken = await signup(app, 'intruder@example.com');
    await request(app.getHttpServer())
      .delete(`/picks/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    // 그리고 픽은 여전히 살아있어야 한다.
    await request(app.getHttpServer())
      .get(`/picks/${created.body.id}`)
      .expect(200);
  });

  it('uuid가 아닌 id는 400으로 거부한다', async () => {
    await request(app.getHttpServer()).get('/picks/not-a-uuid').expect(400);
  });
});
