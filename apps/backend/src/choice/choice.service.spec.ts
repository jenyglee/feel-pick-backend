import { NotFoundException } from '@nestjs/common';
import { ChoiceRepository } from './choice.repository';
import { ChoiceService } from './choice.service';
import Profile from './entities/profile.entity';

describe('ChoiceService', () => {
  let service: ChoiceService;
  let repo: jest.Mocked<ChoiceRepository>;

  const question = {
    id: 'q1',
    text: '술 잘 먹을 것 같은 친구',
    createdAt: new Date(),
  };
  const candidates: Profile[] = [
    {
      id: 'u1',
      displayName: '하리니',
      photoUrl: 'p',
      distanceKm: 17,
      bio: 'hi',
      interests: ['홍대'],
    },
    {
      id: 'u2',
      displayName: '이재원',
      photoUrl: 'p',
      distanceKm: 3,
      bio: null,
      interests: [],
    },
  ];

  beforeEach(() => {
    repo = {
      findRandomQuestion: jest.fn(),
      findQuestionById: jest.fn(),
      questionExists: jest.fn(),
      userExists: jest.fn(),
      findRandomCandidates: jest.fn(),
      createSelection: jest.fn(),
    } as unknown as jest.Mocked<ChoiceRepository>;
    service = new ChoiceService(repo);
  });

  describe('getFeed', () => {
    it('질문ID가 없으면 랜덤 질문 + 후보를 반환한다', async () => {
      repo.findRandomQuestion.mockResolvedValue(question);
      repo.findRandomCandidates.mockResolvedValue(candidates);

      const feed = await service.getFeed();

      expect(repo.findRandomQuestion).toHaveBeenCalled();
      expect(feed.question.text).toBe(question.text);
      expect(feed.candidates).toHaveLength(2);
    });

    it('질문ID가 있으면 같은 질문을 조회해 반환한다 (다시 섞기)', async () => {
      repo.findQuestionById.mockResolvedValue(question);
      repo.findRandomCandidates.mockResolvedValue(candidates);

      const feed = await service.getFeed('q1');

      expect(repo.findQuestionById).toHaveBeenCalledWith('q1');
      expect(repo.findRandomQuestion).not.toHaveBeenCalled();
      expect(feed.question.id).toBe('q1');
    });

    it('질문이 없으면 NotFoundException', async () => {
      repo.findRandomQuestion.mockResolvedValue(null);
      await expect(service.getFeed()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('select', () => {
    it('선택을 기록하고 새 피드를 반환한다', async () => {
      repo.questionExists.mockResolvedValue(true);
      repo.userExists.mockResolvedValue(true);
      repo.createSelection.mockResolvedValue({} as never);
      repo.findRandomQuestion.mockResolvedValue(question);
      repo.findRandomCandidates.mockResolvedValue(candidates);

      const feed = await service.select({
        questionId: 'q1',
        selectedUserId: 'u1',
      });

      expect(repo.createSelection).toHaveBeenCalledWith({
        questionId: 'q1',
        selectedUserId: 'u1',
      });
      expect(feed.candidates).toHaveLength(2);
    });

    it('질문이 없으면 NotFoundException (기록 안 함)', async () => {
      repo.questionExists.mockResolvedValue(false);

      await expect(
        service.select({ questionId: 'nope', selectedUserId: 'u1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.createSelection).not.toHaveBeenCalled();
    });

    it('선택한 유저가 없으면 NotFoundException (기록 안 함)', async () => {
      repo.questionExists.mockResolvedValue(true);
      repo.userExists.mockResolvedValue(false);

      await expect(
        service.select({ questionId: 'q1', selectedUserId: 'nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.createSelection).not.toHaveBeenCalled();
    });
  });
});
