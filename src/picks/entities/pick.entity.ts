import { ApiProperty } from '@nestjs/swagger';

export class PickOption {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ minimum: 0 })
  votes: number;
}

export class Pick {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: [PickOption] })
  options: PickOption[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
