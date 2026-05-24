import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// PrismaService와 동일한 어댑터 구성 (standalone 스크립트용).
function createAdapter(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
  });
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL ?? ''),
});

const QUESTIONS = [
  '술 잘 먹을 것 같은 친구',
  '1프로라도 관심이 가는 친구',
  '같이 여행 가고 싶은 친구',
  '고민을 잘 들어줄 것 같은 친구',
  '노래방에서 신날 것 같은 친구',
  '오래 볼 것 같은 친구',
];

type SeedUser = {
  handle: string;
  displayName: string;
  img: number; // pravatar 이미지 번호 (1~70)
  bio: string;
  distanceKm: number;
  interests: string[];
};

const USERS: SeedUser[] = [
  { handle: 'hxrxx', displayName: '하리니', img: 5, bio: '@hx_rxx_ 맞팔도 받아용!', distanceKm: 17, interests: ['홍대', '스티커 사진', '닌텐도', '공부', '스요잉', '댄스'] },
  { handle: 'jaewon', displayName: '이재원', img: 12, bio: '주말엔 무조건 카페 투어 ☕', distanceKm: 3, interests: ['카페', '사진', '러닝'] },
  { handle: 'vzzing', displayName: 'v찡', img: 16, bio: '웃긴 거 보내주면 친구 됨ㅋㅋ', distanceKm: 8, interests: ['밈', '게임', '맛집'] },
  { handle: 'sora', displayName: '소라', img: 20, bio: '전시 같이 갈 사람 구해요', distanceKm: 12, interests: ['전시', '디자인', '와인'] },
  { handle: 'minjun', displayName: '민준', img: 25, bio: '러닝크루 모집 중 🏃', distanceKm: 22, interests: ['러닝', '헬스', '등산'] },
  { handle: 'yuna', displayName: '유나', img: 31, bio: '노래방 가면 4시간 기본', distanceKm: 5, interests: ['노래방', '뮤지컬', '카페'] },
  { handle: 'doyun', displayName: '도윤', img: 44, bio: '보드게임 / 방탈출 좋아해요', distanceKm: 15, interests: ['보드게임', '방탈출', '캠핑'] },
  { handle: 'haeun', displayName: '하은', img: 47, bio: '강아지랑 산책하는 게 취미예요 🐶', distanceKm: 9, interests: ['반려견', '산책', '베이킹'] },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('seed-password-1234', 10);

  // 질문: 비어있을 때만 시드 (재실행 시 중복 방지).
  if ((await prisma.question.count()) === 0) {
    await prisma.question.createMany({
      data: QUESTIONS.map((text) => ({ text })),
    });
  }

  // 프로필 유저: email 기준 upsert (재실행 안전).
  for (const u of USERS) {
    const email = `${u.handle}@seed.feelpick.dev`;
    const profile = {
      displayName: u.displayName,
      photoUrl: `https://i.pravatar.cc/600?img=${u.img}`,
      bio: u.bio,
      distanceKm: u.distanceKm,
      interests: u.interests,
    };
    await prisma.user.upsert({
      where: { email },
      update: profile,
      create: { email, passwordHash, ...profile },
    });
  }

  const [q, n] = await Promise.all([
    prisma.question.count(),
    prisma.user.count(),
  ]);
  console.log(`Seed 완료: 질문 ${q}개, 유저 ${n}명`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
