import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PicksService } from './picks.service';

describe('PicksService', () => {
  let service: PicksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PicksService],
    }).compile();
    service = module.get(PicksService);
  });

  it('creates a pick with options and starts vote counts at zero', () => {
    const pick = service.create({
      title: 'Lunch',
      options: ['Pizza', 'Salad'],
    });
    expect(pick.id).toBeDefined();
    expect(pick.options).toHaveLength(2);
    expect(pick.options.every((o) => o.votes === 0)).toBe(true);
  });

  it('increments the vote count for the chosen option', () => {
    const pick = service.create({
      title: 'Drink',
      options: ['Coffee', 'Tea'],
    });
    const target = pick.options[0];
    const updated = service.vote(pick.id, { optionId: target.id });
    const voted = updated.options.find((o) => o.id === target.id);
    expect(voted?.votes).toBe(1);
  });

  it('throws when voting on a missing option', () => {
    const pick = service.create({
      title: 'Snack',
      options: ['Chips', 'Cookies'],
    });
    expect(() => service.vote(pick.id, { optionId: 'nope' })).toThrow(
      NotFoundException,
    );
  });
});
