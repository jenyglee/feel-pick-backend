import { Module } from '@nestjs/common';
import { ChoiceController } from './choice.controller';
import { ChoiceRepository } from './choice.repository';
import { ChoiceService } from './choice.service';

@Module({
  controllers: [ChoiceController],
  providers: [ChoiceService, ChoiceRepository],
})
export class ChoiceModule {}
