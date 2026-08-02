
export interface TtsOptions {
  voice?: string;
  rate?: number;
}

export interface TtsResult {
  provider: string;
  mock: boolean;
  audioUrl: string | null;
  durationSec: number;
  text: string;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, opts?: TtsOptions): Promise<TtsResult>;
}

const WORDS_PER_MINUTE = 130;

function estimateDurationSec(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = words / WORDS_PER_MINUTE / Math.max(rate, 0.1);
  return Math.round(minutes * 60);
}

export class MockTtsProvider implements TtsProvider {
  readonly name = 'mock';

  async synthesize(text: string, opts: TtsOptions = {}): Promise<TtsResult> {
    return {
      provider: this.name,
      mock: true,
      audioUrl: null,
      durationSec: estimateDurationSec(text, opts.rate),
      text,
    };
  }
}

export class MeloTtsProvider implements TtsProvider {
  readonly name = 'melotts';
  private readonly baseUrl: string | undefined;

  constructor(baseUrl = process.env.MELOTTS_URL) {
    this.baseUrl = baseUrl;
  }

  async synthesize(_text: string, _opts: TtsOptions = {}): Promise<TtsResult> {
    if (!this.baseUrl) {
      throw new Error('MELOTTS_URL is not configured');
    }
    throw new Error('MeloTTS adapter is not wired up yet');
  }
}

export function getTtsProvider(): TtsProvider {
  return new MockTtsProvider();
}
