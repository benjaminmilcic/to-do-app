import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TranscriptionController } from './transcription.controller.js';
import { TranscriptionService } from './transcription.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
})
export class TranscriptionModule {}
