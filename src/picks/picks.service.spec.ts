import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Pick from './entities/pick.entity';
import { PicksRepository } from './picks.repository';
import { PicksService } from './picks.service';

function makePick(over: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-id',
    title: 'Lunch',
    description: null,
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

  it('delegates create to the repository with trimmed values', async () => {
    const expected = makePick();
    repo.create.mockResolvedValue(expected);

    const result = await service.create({
      title: '  Lunch  ',
      description: '  ',
      options: ['  Pizza  ', 'Salad'],
    });

    expect(repo.create).toHaveBeenCalledWith({
      title: 'Lunch',
      description: undefined,
      options: [{ label: 'Pizza' }, { label: 'Salad' }],
    });
    expect(result).toBe(expected);
  });

  it('throws NotFound when findOne sees null from repository', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFound when voting on a missing option', async () => {
    repo.optionExists.mockResolvedValue(false);
    await expect(
      service.vote('pick-id', { optionId: 'nope' }),
    ).rejects.toThrow(NotFoundException);
    expect(repo.incrementVote).not.toHaveBeenCalled();
  });

  it('increments vote when option exists', async () => {
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

  it('throws NotFound when deleting a missing pick', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
