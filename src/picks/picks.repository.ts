import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import Pick from './entities/pick.entity';

const pickWithOptions = {
  include: { options: true },
} satisfies Prisma.PickDefaultArgs;

@Injectable()
export class PicksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    title: string;
    description?: string;
    options: { label: string }[];
  }): Promise<Pick> {
    return this.prisma.pick.create({
      data: {
        title: data.title,
        description: data.description,
        options: { create: data.options },
      },
      ...pickWithOptions,
    });
  }

  findAll(): Promise<Pick[]> {
    return this.prisma.pick.findMany({
      ...pickWithOptions,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string): Promise<Pick | null> {
    return this.prisma.pick.findUnique({
      where: { id },
      ...pickWithOptions,
    });
  }

  incrementVote(pickId: string, optionId: string): Promise<Pick> {
    return this.prisma.pick.update({
      where: { id: pickId },
      data: {
        options: {
          update: {
            where: { id: optionId },
            data: { votes: { increment: 1 } },
          },
        },
      },
      ...pickWithOptions,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.pick.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async optionExists(pickId: string, optionId: string): Promise<boolean> {
    const count = await this.prisma.pickOption.count({
      where: { id: optionId, pickId },
    });
    return count > 0;
  }
}
