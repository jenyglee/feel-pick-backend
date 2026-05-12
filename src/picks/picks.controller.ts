import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CreatePickDto } from './dto/create-pick.dto';
import { VoteDto } from './dto/vote.dto';
import { PicksService } from './picks.service';

@Controller('picks')
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @Post()
  create(@Body() dto: CreatePickDto) {
    return this.picksService.create(dto);
  }

  @Get()
  findAll() {
    return this.picksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.picksService.findOne(id);
  }

  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.picksService.vote(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    this.picksService.remove(id);
  }
}
