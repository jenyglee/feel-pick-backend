import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import User from '../users/entities/user.entity';
import { CreatePickDto } from './dto/create-pick.dto';
import { VoteDto } from './dto/vote.dto';
import Pick from './entities/pick.entity';
import { PicksService } from './picks.service';

@ApiTags('picks')
@Controller('picks')
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a pick (auth required)' })
  @ApiResponse({ status: 201, type: Pick })
  create(@CurrentUser() user: User, @Body() dto: CreatePickDto): Promise<Pick> {
    return this.picksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all picks' })
  @ApiResponse({ status: 200, type: [Pick] })
  findAll(): Promise<Pick[]> {
    return this.picksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pick by id' })
  @ApiResponse({ status: 200, type: Pick })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Pick> {
    return this.picksService.findOne(id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on an option of a pick' })
  @ApiResponse({ status: 201, type: Pick })
  vote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoteDto,
  ): Promise<Pick> {
    return this.picksService.vote(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a pick (owner only)' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.picksService.remove(user.id, id);
  }
}
