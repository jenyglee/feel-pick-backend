import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ChoiceService } from './choice.service';
import { SelectChoiceDto } from './dto/select-choice.dto';
import ChoiceFeed from './entities/choice-feed.entity';

@ApiTags('choices')
@Controller('choices')
export class ChoiceController {
  constructor(private readonly service: ChoiceService) {}

  @Get()
  @ApiOperation({
    summary: '초이스 피드 (질문 + 랜덤 후보 4명)',
    description:
      'questionId 없으면 새 질문(초기/스킵), 있으면 같은 질문 + 새 후보(다시 섞기).',
  })
  @ApiQuery({ name: 'questionId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: ChoiceFeed })
  getFeed(@Query('questionId') questionId?: string): Promise<ChoiceFeed> {
    return this.service.getFeed(questionId);
  }

  @Post('select')
  @ApiOperation({ summary: '카드 선택 기록 후 다음 피드 반환' })
  @ApiOkResponse({ type: ChoiceFeed })
  select(@Body() dto: SelectChoiceDto): Promise<ChoiceFeed> {
    return this.service.select(dto);
  }
}
