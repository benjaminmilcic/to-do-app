import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/** Error with a translation key as message, shown to the user as a toast. */
export class VoiceInputError extends Error {}

/**
 * Records audio from the microphone and turns it into text through the
 * backend (Whisper on Groq). Ported from the llm-test project.
 */
@Injectable({ providedIn: 'root' })
export class VoiceInputService {
  private readonly http = inject(HttpClient);

  readonly state = signal<VoiceState>('idle');
  /** The live microphone stream while recording - drives the waveform. */
  readonly stream = signal<MediaStream | null>(null);

  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];

  async start(): Promise<void> {
    if (this.state() !== 'idle') {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new VoiceInputError('voice.errors.unsupported');
    }

    const stream = await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .catch(() => {
        throw new VoiceInputError('voice.errors.permission');
      });
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.recorder.start();
    this.stream.set(stream);
    this.state.set('recording');
  }

  /** Stops the recording and resolves with the recognised text ('' if nothing was said). */
  async stop(): Promise<string> {
    const recorder = this.recorder;
    if (!recorder || this.state() !== 'recording') {
      return '';
    }
    await this.stopRecorder(recorder);

    const mimeType = recorder.mimeType || 'audio/webm';
    const audio = new Blob(this.chunks, { type: mimeType });
    if (!audio.size) {
      this.reset();
      return '';
    }

    this.state.set('transcribing');
    try {
      const form = new FormData();
      form.append('audio', audio, `recording.${extensionFor(mimeType)}`);
      const { text } = await firstValueFrom(
        this.http.post<{ text: string }>(`${API_URL}/transcribe`, form),
      );
      return text;
    } catch {
      throw new VoiceInputError('voice.errors.failed');
    } finally {
      this.reset();
    }
  }

  /** Stops the recording and throws the audio away. */
  async cancel(): Promise<void> {
    if (this.recorder && this.state() === 'recording') {
      await this.stopRecorder(this.recorder);
    }
    this.reset();
  }

  private async stopRecorder(recorder: MediaRecorder): Promise<void> {
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.stop();
    await stopped;
    // Turns off the microphone indicator of the browser / phone.
    recorder.stream.getTracks().forEach((track) => track.stop());
    this.recorder = undefined;
  }

  private reset(): void {
    this.chunks = [];
    this.stream.set(null);
    this.state.set('idle');
  }
}

/** Whisper infers the audio format from the file extension. */
function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}
