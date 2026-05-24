import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Profile from './entities/profile.entity';

// 카드에 노출할 프로필 필드만 선택 (passwordHash/email 제외).
const profileSelect = {
  id: true,
  displayName: true,
  photoUrl: true,
  distanceKm: true,
  bio: true,
  interests: true,
} as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class ChoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRandomQuestion() {
    const questions = await this.prisma.question.findMany();
    if (questions.length === 0) return null;
    return questions[Math.floor(Math.random() * questions.length)];
  }

  findQuestionById(id: string) {
    return this.prisma.question.findUnique({ where: { id } });
  }

  async questionExists(id: string): Promise<boolean> {
    return (await this.prisma.question.count({ where: { id } })) > 0;
  }

  async userExists(id: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id } })) > 0;
  }

  // 프로필(photoUrl) 있는 유저만 카드 후보로. 랜덤 count명.
  async findRandomCandidates(count: number): Promise<Profile[]> {
    const users = await this.prisma.user.findMany({
      where: { photoUrl: { not: null } },
      select: profileSelect,
    });
    return shuffle(users)
      .slice(0, count)
      .map((u) => ({
        ...u,
        interests: Array.isArray(u.interests) ? (u.interests as string[]) : [],
      }));
  }

  createSelection(data: {
    questionId: string;
    selectedUserId: string;
    selectorUserId?: string | null;
  }) {
    return this.prisma.selection.create({ data });
  }
}
