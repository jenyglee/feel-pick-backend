import { ApiProperty } from '@nestjs/swagger';

export class PickOption {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ minimum: 0 })
  votes: number;

  @ApiProperty({ format: 'uuid' })
  pickId: string;
}

export default class Pick {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ type: [PickOption] })
  options: PickOption[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
