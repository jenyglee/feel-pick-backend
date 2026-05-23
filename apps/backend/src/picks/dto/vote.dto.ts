import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class VoteDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  optionId: string;
}
