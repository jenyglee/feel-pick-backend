import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePickDto } from './dto/create-pick.dto';
import { VoteDto } from './dto/vote.dto';
import { Pick, PickOption } from './entities/pick.entity';

@Injectable()
export class PicksService {
  private readonly picks = new Map<string, Pick>();

  create(dto: CreatePickDto): Pick {
    const title = dto.title?.trim();
    console.log('title', title);
    if (!title) {
      throw new BadRequestException('title is required');
    }
    const labels = (dto.options ?? []).map((o) => o?.trim()).filter(Boolean);
    if (labels.length < 2) {
      throw new BadRequestException('at least 2 options are required');
    }

    const options: PickOption[] = labels.map((label) => ({
      id: randomUUID(),
      label,
      votes: 0,
    }));

    const pick: Pick = {
      id: randomUUID(),
      title,
      description: dto.description?.trim() || undefined,
      options,
      createdAt: new Date(),
    };
    this.picks.set(pick.id, pick);
    return pick;
  }

  findAll(): Pick[] {
    return Array.from(this.picks.values());
  }

  findOne(id: string): Pick {
    const pick = this.picks.get(id);
    if (!pick) {
      throw new NotFoundException(`pick ${id} not found`);
    }
    return pick;
  }

  vote(id: string, dto: VoteDto): Pick {
    const pick = this.findOne(id);
    const option = pick.options.find((o) => o.id === dto.optionId);
    if (!option) {
      throw new NotFoundException(`option ${dto.optionId} not found`);
    }
    option.votes += 1;
    return pick;
  }

  remove(id: string): void {
    if (!this.picks.delete(id)) {
      throw new NotFoundException(`pick ${id} not found`);
    }
  }
}
