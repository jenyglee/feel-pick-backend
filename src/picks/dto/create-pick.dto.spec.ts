import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePickDto } from './create-pick.dto';

function validate(input: unknown) {
  const dto = plainToInstance(CreatePickDto, input);
  return validateSync(dto);
}

describe('CreatePickDto', () => {
  it('passes with a valid title and 2+ options', () => {
    const errors = validate({ title: 'Lunch', options: ['A', 'B'] });
    expect(errors).toHaveLength(0);
  });

  it('fails when fewer than 2 options are provided', () => {
    const errors = validate({ title: 'Solo', options: ['only'] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'options')).toBe(true);
  });

  it('fails when title is missing', () => {
    const errors = validate({ options: ['A', 'B'] });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });
});
