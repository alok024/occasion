
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 8000;

export const GROQ_MOCK = !GROQ_API_KEY && !OPENAI_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
  mockResponder?: (messages: ChatMessage[]) => string;
}

interface Provider {
  label: string;
  url: string;
  key: string;
  model: string;
}

const GROQ_PROVIDER: Provider = {
  label: 'Groq',
  url: 'https://api.groq.com/openai/v1/chat/completions',
  key: GROQ_API_KEY,
  model: GROQ_MODEL,
};

const OPENAI_PROVIDER: Provider = {
  label: 'OpenAI',
  url: 'https://api.openai.com/v1/chat/completions',
  key: OPENAI_API_KEY,
  model: OPENAI_MODEL,
};

async function callProvider(provider: Provider, messages: ChatMessage[], opts: GenerateOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 1024,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${provider.label} request timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateText(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<string> {
  if (GROQ_MOCK) {
    if (opts.mockResponder) return opts.mockResponder(messages);
    const last = messages[messages.length - 1]?.content ?? '';
    return `[[MOCK OUTPUT — no GROQ_API_KEY set]]\nEcho of prompt: ${last.slice(0, 400)}`;
  }

  const useOpenAI = !GROQ_API_KEY && !!OPENAI_API_KEY;
  let provider = useOpenAI ? OPENAI_PROVIDER : GROQ_PROVIDER;
  let res = await callProvider(provider, messages, opts);

  if (!useOpenAI && (res.status === 429 || res.status >= 500) && OPENAI_API_KEY) {
    provider = OPENAI_PROVIDER;
    res = await callProvider(provider, messages, opts);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${provider.label} ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) {
    throw new Error(`${provider.label} returned an empty completion`);
  }
  return content;
}

export async function generateJSON<T = unknown>(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<T> {
  const text = await generateText(messages, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error('Model did not return valid JSON');
  }
}
