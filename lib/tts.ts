// Text-to-speech provider boundary for the delivery kit's voice-rehearsal button.
// The mock provider is what actually runs today — no network call, no audio file,
// just a pacing estimate so the UI has something to react to. The MeloTtsProvider
// below is shaped to match the founder's self-hosted Vachix MeloTTS service (see
// vachix-tts-selfhosted-melotts) so wiring it up later is a small diff, but it is
// deliberately not wired into getTtsProvider() in this build — no live external
// calls, no MELOTTS_URL required, keyless build/smoke stay green.

export interface TtsOptions {
  voice?: string;
  rate?: number; // speaking-rate multiplier, 1.0 = normal pace
}

export interface TtsResult {
  provider: string;
  mock: boolean;
  audioUrl: string | null; // always null from the mock — nothing is actually synthesized
  durationSec: number;
  text: string;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, opts?: TtsOptions): Promise<TtsResult>;
}

const WORDS_PER_MINUTE = 130; // slow, steady eulogy-reading pace; mirrors DeliveryKit's estimate

function estimateDurationSec(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = words / WORDS_PER_MINUTE / Math.max(rate, 0.1);
  return Math.round(minutes * 60);
}

// Active provider: returns a timing estimate immediately, no audio. Enough to drive
// the rehearsal button while no TTS vendor is connected.
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

// Adapter stub for the founder's self-hosted MeloTTS service. Reads MELOTTS_URL so the
// shape is ready, but does not make a request — this run stays keyless and offline.
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
    // Intentionally unimplemented: when the service is reachable, POST { text, voice, rate }
    // to `${this.baseUrl}/synthesize` and return the resulting audio descriptor here.
    throw new Error('MeloTTS adapter is not wired up yet');
  }
}

// Always the mock today. Swap the return value once MeloTtsProvider is actually wired up.
export function getTtsProvider(): TtsProvider {
  return new MockTtsProvider();
}
