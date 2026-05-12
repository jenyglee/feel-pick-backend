import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PicksModule } from './picks/picks.module';

@Module({
  imports: [PicksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
