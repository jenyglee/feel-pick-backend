import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { email: string; passwordHash: string; displayName: string }) {
    return this.prisma.user.create({
      data,
      select: publicUserSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }
}
