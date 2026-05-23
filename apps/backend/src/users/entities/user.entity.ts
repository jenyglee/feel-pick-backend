import { ApiProperty } from '@nestjs/swagger';

export default class User {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
