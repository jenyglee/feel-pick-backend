import { Module } from '@nestjs/common';
import { PicksController } from './picks.controller';
import { PicksRepository } from './picks.repository';
import { PicksService } from './picks.service';

@Module({
  controllers: [PicksController],
  providers: [PicksService, PicksRepository],
})
export class PicksModule {}
