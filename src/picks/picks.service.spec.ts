import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Pick from './entities/pick.entity';
import { PicksRepository } from './picks.repository';
import { PicksService } from './picks.service';

const OWNER_ID = 'user-1';

function makePick(over: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-id',
    title: 'Lunch',
    description: null,
    userId: OWNER_ID,
    createdAt: new Date(),
    options: [
      { id: 'opt-1', label: 'Pizza', votes: 0, pickId: 'pick-id' },
      { id: 'opt-2', label: 'Salad', votes: 0, pickId: 'pick-id' },
    ],
    ...over,
  };
}

type RepoMock = jest.Mocked<PicksRepository>;

function createRepoMock(): RepoMock {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    incrementVote: jest.fn(),
    delete: jest.fn(),
    optionExists: jest.fn(),
  } as unknown as RepoMock;
}

describe('PicksService', () => {
  let service: PicksService;
  let repo: RepoMock;

  beforeEach(async () => {
    repo = createRepoMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PicksService, { provide: PicksRepository, useValue: repo }],
    }).compile();
    service = module.get(PicksService);
  });

  it('create 호출 시 공백을 다듬고 owner id를 붙여 repository에 위임한다', async () => {
    const expected = makePick();
    repo.create.mockResolvedValue(expected);

    const result = await service.create(OWNER_ID, {
      title: '  Lunch  ',
      description: '  ',
      options: ['  Pizza  ', 'Salad'],
    });

    expect(repo.create).toHaveBeenCalledWith({
      userId: OWNER_ID,
      title: 'Lunch',
      description: undefined,
      options: [{ label: 'Pizza' }, { label: 'Salad' }],
    });
    expect(result).toBe(expected);
  });

  it('repository가 null을 주면 findOne은 NotFound를 던진다', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('없는 옵션에 투표하면 NotFound를 던진다', async () => {
    repo.optionExists.mockResolvedValue(false);
    await expect(service.vote('pick-id', { optionId: 'nope' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.incrementVote).not.toHaveBeenCalled();
  });

  it('옵션이 존재하면 투표 수를 올린다', async () => {
    const updated = makePick({
      options: [
        { id: 'opt-1', label: 'Pizza', votes: 1, pickId: 'pick-id' },
        { id: 'opt-2', label: 'Salad', votes: 0, pickId: 'pick-id' },
      ],
    });
    repo.optionExists.mockResolvedValue(true);
    repo.incrementVote.mockResolvedValue(updated);

    const result = await service.vote('pick-id', { optionId: 'opt-1' });

    expect(repo.incrementVote).toHaveBeenCalledWith('pick-id', 'opt-1');
    expect(result).toBe(updated);
  });

  it('없는 픽을 삭제하면 NotFound를 던진다', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove(OWNER_ID, 'missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('남의 픽을 삭제하면 Forbidden을 던진다', async () => {
    repo.findOne.mockResolvedValue(makePick({ userId: 'other-user' }));
    await expect(service.remove(OWNER_ID, 'pick-id')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('본인이 만든 픽은 삭제한다', async () => {
    repo.findOne.mockResolvedValue(makePick());
    repo.delete.mockResolvedValue(true);
    await service.remove(OWNER_ID, 'pick-id');
    expect(repo.delete).toHaveBeenCalledWith('pick-id');
  });
});
