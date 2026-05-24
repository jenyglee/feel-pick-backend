import { ApiProperty } from '@nestjs/swagger';
import Profile from './profile.entity';
import Question from './question.entity';

// 한 번의 초이스 화면 = 질문 1개 + 후보 카드 N개.
export default class ChoiceFeed {
  @ApiProperty({ type: Question })
  question: Question;

  @ApiProperty({ type: [Profile], description: '랜덤하게 주어지는 후보 카드' })
  candidates: Profile[];
}
