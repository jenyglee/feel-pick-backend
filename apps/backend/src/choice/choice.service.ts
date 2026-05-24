import { Injectable, NotFoundException } from '@nestjs/common';
import { ChoiceRepository } from './choice.repository';
import { SelectChoiceDto } from './dto/select-choice.dto';
import ChoiceFeed from './entities/choice-feed.entity';

const CANDIDATE_COUNT = 4;

@Injectable()
export class ChoiceService {
  constructor(private readonly repo: ChoiceRepository) {}

  /**
   * 초이스 피드를 만든다.
   * - questionId 없음: 새 랜덤 질문 + 랜덤 4명 (초기 로드 / 스킵)
   * - questionId 있음: 같은 질문 + 랜덤 4명 (다시 섞기)
   */
  async getFeed(questionId?: string): Promise<ChoiceFeed> {
    const question = questionId
      ? await this.repo.findQuestionById(questionId)
      : await this.repo.findRandomQuestion();
    if (!question) {
      throw new NotFoundException(
        '질문이 없습니다. (시드: npm run prisma:seed -w @feel-pick/backend)',
      );
    }

    const candidates = await this.repo.findRandomCandidates(CANDIDATE_COUNT);
    return { question, candidates };
  }

  /** 선택을 기록하고, 새 질문 + 새 후보를 반환한다. */
  async select(dto: SelectChoiceDto): Promise<ChoiceFeed> {
    if (!(await this.repo.questionExists(dto.questionId))) {
      throw new NotFoundException('질문을 찾을 수 없습니다.');
    }
    if (!(await this.repo.userExists(dto.selectedUserId))) {
      throw new NotFoundException('선택한 유저를 찾을 수 없습니다.');
    }

    // 공개 API라 selector(누가 골랐는지)는 비워둠. 인증 도입 시 채운다.
    await this.repo.createSelection({
      questionId: dto.questionId,
      selectedUserId: dto.selectedUserId,
    });

    return this.getFeed();
  }
}
