import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TranscriptionService } from './transcription.service.js';

/** The parts of a multer upload we need (avoids pulling in @types/multer). */
interface AudioUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** Groq accepts audio files up to 25 MB on the free tier. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Speech-to-text for the voice input. Signed-in users only and rate limited,
 * because every call is billed to the Groq account.
 */
@Controller('transcribe')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  constructor(private readonly transcription: TranscriptionService) {}

  /** multipart/form-data with the recording in the field `audio`; returns `{ text }`. */
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }),
  )
  async transcribe(
    @UploadedFile() audio?: AudioUpload,
  ): Promise<{ text: string }> {
    if (!audio?.buffer?.length) {
      throw new BadRequestException('audio file is required');
    }
    if (
      !audio.mimetype.startsWith('audio/') &&
      !audio.mimetype.startsWith('video/')
    ) {
      throw new BadRequestException('audio file expected');
    }
    const text = await this.transcription.transcribe(
      audio.buffer,
      audio.originalname || 'recording.webm',
      audio.mimetype,
    );
    return { text };
  }
}
