import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

/** Groq's OpenAI-compatible speech-to-text endpoint. */
const GROQ_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * Turns a recorded audio clip into text with Whisper on Groq (the same model
 * the llm-test project uses through LiteLLM). The language is detected
 * automatically, so German, English and Croatian all work.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async transcribe(
    audio: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const settings = this.config.transcription;
    if (!settings) {
      throw new ServiceUnavailableException('Voice input is not configured');
    }

    const form = new FormData();
    // Whisper infers the audio format from the file name.
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      filename,
    );
    form.append('model', settings.model);
    form.append('response_format', 'json');

    let response: Response;
    try {
      response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      this.logger.error(`Groq not reachable: ${String(error)}`);
      throw new BadGatewayException('Speech recognition is not reachable');
    }

    if (!response.ok) {
      // The body may contain details, but never the key; log it for debugging.
      this.logger.error(
        `Groq answered ${response.status}: ${(await response.text()).slice(0, 500)}`,
      );
      throw new BadGatewayException('Speech recognition failed');
    }
    const result = (await response.json()) as { text?: string };
    return (result.text ?? '').trim();
  }
}
