import { ApiProperty } from '@nestjs/swagger';

// 카드 위에 제시되는 질문(타이틀).
export default class Question {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '술 잘 먹을 것 같은 친구' })
  text: string;
}
