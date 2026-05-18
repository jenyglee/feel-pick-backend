import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePickDto } from './dto/create-pick.dto';
import { VoteDto } from './dto/vote.dto';
import Pick from './entities/pick.entity';
import { PicksService } from './picks.service';

@ApiTags('picks')
@Controller('picks')
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pick' })
  @ApiResponse({ status: 201, type: Pick })
  create(@Body() dto: CreatePickDto): Pick {
    return this.picksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all picks' })
  @ApiResponse({ status: 200, type: [Pick] })
  findAll(): Pick[] {
    return this.picksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pick by id' })
  @ApiResponse({ status: 200, type: Pick })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Pick {
    return this.picksService.findOne(id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on an option of a pick' })
  @ApiResponse({ status: 201, type: Pick })
  vote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoteDto,
  ): Pick {
    return this.picksService.vote(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a pick' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', new ParseUUIDPipe()) id: string): void {
    this.picksService.remove(id);
  }
}
