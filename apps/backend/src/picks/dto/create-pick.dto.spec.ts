import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePickDto } from './create-pick.dto';

function validate(input: unknown) {
  const dto = plainToInstance(CreatePickDto, input);
  return validateSync(dto);
}

describe('CreatePickDto', () => {
  it('유효한 제목과 옵션 2개 이상이면 통과한다', () => {
    const errors = validate({ title: 'Lunch', options: ['A', 'B'] });
    expect(errors).toHaveLength(0);
  });

  it('옵션이 2개 미만이면 실패한다', () => {
    const errors = validate({ title: 'Solo', options: ['only'] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'options')).toBe(true);
  });

  it('제목이 없으면 실패한다', () => {
    const errors = validate({ options: ['A', 'B'] });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });
});
