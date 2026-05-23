import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-app';

const user = {
  email: 'alice@example.com',
  password: 'P@ssw0rd!',
  displayName: 'Alice',
};

describe('인증 (e2e)', () => {
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

  it('회원가입하면 액세스 토큰을 반환한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(0);
  });

  it('어떤 응답에도 passwordHash를 노출하지 않는다', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${signup.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      email: user.email,
      displayName: user.displayName,
    });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('중복 이메일은 409로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(409);
  });

  it('잘못된 회원가입 입력은 400으로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('올바른 자격증명으로 로그인된다', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(201);

    expect(typeof res.body.accessToken).toBe('string');
  });

  it('틀린 비밀번호는 401로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);
  });

  it('토큰 없이 /auth/me 호출은 401로 거부한다', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
