import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePickDto } from './dto/create-pick.dto';
import { VoteDto } from './dto/vote.dto';
import Pick from './entities/pick.entity';
import { PicksRepository } from './picks.repository';

@Injectable()
export class PicksService {
  constructor(private readonly picks: PicksRepository) {}

  create(userId: string, dto: CreatePickDto): Promise<Pick> {
    const description = dto.description?.trim();
    return this.picks.create({
      userId,
      title: dto.title.trim(),
      description: description ? description : undefined,
      options: dto.options.map((label) => ({ label: label.trim() })),
    });
  }

  findAll(): Promise<Pick[]> {
    return this.picks.findAll();
  }

  async findOne(id: string): Promise<Pick> {
    const pick = await this.picks.findOne(id);
    if (!pick) {
      throw new NotFoundException(`pick ${id} not found`);
    }
    return pick;
  }

  async vote(id: string, dto: VoteDto): Promise<Pick> {
    const exists = await this.picks.optionExists(id, dto.optionId);
    if (!exists) {
      throw new NotFoundException(
        `option ${dto.optionId} not found on pick ${id}`,
      );
    }
    return this.picks.incrementVote(id, dto.optionId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const pick = await this.picks.findOne(id);
    if (!pick) {
      throw new NotFoundException(`pick ${id} not found`);
    }
    if (pick.userId !== userId) {
      throw new ForbiddenException('You can only delete your own picks');
    }
    await this.picks.delete(id);
  }
}
