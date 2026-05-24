import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// 카드를 오른쪽으로 날려 선택했을 때 전송하는 입력.
export class SelectChoiceDto {
  @ApiProperty({ format: 'uuid', description: '제시된 질문 ID' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ format: 'uuid', description: '선택한 유저 ID' })
  @IsUUID()
  selectedUserId: string;
}
