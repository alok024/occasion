
import { generateText, type ChatMessage } from './groq';

export interface SpeechInput {
  occasion: string;
  speaker: string;
  honoree: string;
  relationship: string;
  tone: string;
  anecdotes: string[];
  length: string;
}

export interface Draft {
  style: string;
  title: string;
  text: string;
}

interface StyleDef {
  key: string;
  title: string;
  brief: string;
}

const STYLES: StyleDef[] = [
  { key: 'heartfelt', title: 'From the heart', brief: 'sincere, warm, emotionally direct' },
  { key: 'story', title: 'The story of us', brief: 'narrative, told as one unfolding story' },
  { key: 'funny', title: 'With a smile', brief: 'light, affectionate, gently humorous' },
  { key: 'short', title: 'Short and sweet', brief: 'tight, punchy, under a minute to read' },
];

interface OccasionMeta {
  open: (i: SpeechInput) => string;
  raise: string;
  toast: (i: SpeechInput) => string;
}

function occasionMeta(occasion: string): OccasionMeta {
  const o = occasion.toLowerCase();
  if (o.includes('eulogy') || o.includes('memorial') || o.includes('funeral')) {
    return {
      open: (i) => `We are here to remember ${i.honoree}, and to say out loud what ${i.honoree} meant to all of us.`,
      raise: 'let us hold close the memory of',
      toast: (i) => `Rest easy, ${i.honoree}. You were loved, and you will be remembered.`,
    };
  }
  if (o.includes('vow')) {
    return {
      open: (i) => `${i.honoree}, standing here in front of everyone we love, I want to tell you what I promise you.`,
      raise: 'today I give my heart to',
      toast: (i) => `${i.honoree}, from this day on, I am yours. I promise.`,
    };
  }
  if (o.includes('anniversary') || o.includes('retirement')) {
    return {
      open: (i) => `Thank you all for being here to celebrate ${i.honoree}. Some milestones deserve a proper pause, and this is one of them.`,
      raise: 'raise a glass to',
      toast: (i) => `So here's to ${i.honoree} — to everything already behind us, and to all the good still ahead.`,
    };
  }
  return {
    open: (i) => `For those who don't know me, I'm ${i.speaker}, and I have the honor of being ${i.honoree}'s ${i.relationship}.`,
    raise: 'raise a glass to',
    toast: (i) => `So please, everyone, lift your glass with me — to ${i.honoree}, today and always.`,
  };
}

function cleanAnecdotes(anecdotes: string[]): string[] {
  return anecdotes.map((a) => (a || '').trim().replace(/[.\s]+$/, '')).filter((a) => a.length > 0);
}

function lower1(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function weave(anecdotes: string[], framings: string[]): string {
  return anecdotes
    .map((a, idx) => framings[idx % framings.length].replace('{a}', lower1(a)))
    .join(' ');
}

function composeHeartfelt(i: SpeechInput, m: OccasionMeta, an: string[]): string {
  const rel = `${i.honoree}'s ${i.relationship}`;
  const memories = weave(an, [
    'The first thing that comes to mind is this — {a}.',
    "And I think about it often: {a}.",
    "There's another moment I hold onto: {a}.",
    'Even now it stays with me — {a}.',
  ]);
  return [
    m.open(i),
    `Being ${rel} is not a title I take lightly. It means I have had a front-row seat to who ${i.honoree} really is — not the version people meet for five minutes, but the real one, the one you only see when it counts.`,
    `${memories} None of those are big, headline moments. They're small. But that's exactly the point. Love isn't built in the grand gestures. It's built in the ordinary days, in the showing up, in the quiet ways ${i.honoree} has always been there.`,
    `If I could give ${i.honoree} one thing tonight, it would be this: the certainty that you are seen, and that you are deeply, genuinely loved by everyone in this room.`,
    m.toast(i),
  ].join('\n\n');
}

function composeStory(i: SpeechInput, m: OccasionMeta, an: string[]): string {
  const chapters = weave(an, [
    'It started simply enough: {a}.',
    'Then came the part I love most — {a}.',
    'Somewhere along the way, this happened: {a}.',
    "And here's the moment I'll carry forever — {a}.",
  ]);
  return [
    `Every good speech is really just a story, so let me tell you ours. I'm ${i.speaker}, ${i.honoree}'s ${i.relationship}, and I've had a front-row seat to most of it.`,
    chapters,
    `Put those chapters side by side and a picture appears. It's the picture of someone loyal, someone who stays, someone who turns ordinary days into the memories the rest of us end up telling stories about — like I'm doing right now.`,
    `That's the ${i.honoree} I know. And the best part of the story is that it isn't finished. There are more chapters coming, and I wouldn't miss a single one.`,
    m.toast(i),
  ].join('\n\n');
}

function composeFunny(i: SpeechInput, m: OccasionMeta, an: string[]): string {
  const bits = weave(an, [
    "Let's be honest about how this really went — {a}. Classic.",
    'Exhibit A: {a}. I rest my case.',
    'You want proof? {a}. Enough said.',
    'And who could forget — {a}. Legendary.',
  ]);
  return [
    `Hi everyone, I'm ${i.speaker}. I'm ${i.honoree}'s ${i.relationship}, which basically makes me the keeper of the stories ${i.honoree} was hoping I'd forget. Good news: I didn't.`,
    bits,
    `I could keep going — believe me, I have material — but I'll show mercy. Because underneath all the jokes is something I actually mean: ${i.honoree} is one of the best people I know, and being ${i.honoree}'s ${i.relationship} has been one of the great lucky breaks of my life.`,
    `So I'll trade the punchlines for one honest line: I'm proud of you, and I'm grateful for you.`,
    m.toast(i),
  ].join('\n\n');
}

function composeShort(i: SpeechInput, m: OccasionMeta, an: string[]): string {
  const one = an[0] ? `I think about ${lower1(an[0])}, and about a hundred smaller moments just like it.` : '';
  const two = an[1] ? ` I think about ${lower1(an[1])} too.` : '';
  return [
    `I'll keep this short, because ${i.honoree} would want me to. I'm ${i.speaker}, ${i.honoree}'s ${i.relationship}.`,
    `${one}${two} What all of them have in common is simple: ${i.honoree} shows up, every single time, for the people who matter. That's rarer than it sounds, and it's the whole reason we're here.`,
    m.toast(i),
  ].join('\n\n');
}

function composeByStyle(styleKey: string, i: SpeechInput): string {
  const m = occasionMeta(i.occasion);
  const an = cleanAnecdotes(i.anecdotes);
  const safe = an.length ? an : ['every ordinary day we somehow made better'];
  switch (styleKey) {
    case 'heartfelt':
      return composeHeartfelt(i, m, safe);
    case 'story':
      return composeStory(i, m, safe);
    case 'funny':
      return composeFunny(i, m, safe);
    case 'short':
      return composeShort(i, m, safe);
    default:
      return composeHeartfelt(i, m, safe);
  }
}

function promptFor(style: StyleDef, i: SpeechInput): ChatMessage[] {
  const anecdotes = cleanAnecdotes(i.anecdotes).map((a) => `- ${a}`).join('\n');
  return [
    {
      role: 'system',
      content:
        'You are an expert speechwriter. Write a polished, ready-to-read speech of about 400-600 words. ' +
        'Use natural spoken rhythm, short paragraphs, and no stage directions or bracketed notes. ' +
        'Weave the given anecdotes in naturally. Do not invent facts beyond the anecdotes. No emojis.',
    },
    {
      role: 'user',
      content:
        `Occasion: ${i.occasion}\n` +
        `Speaker: ${i.speaker}\n` +
        `Honoree(s): ${i.honoree}\n` +
        `Speaker's relationship to honoree: ${i.relationship}\n` +
        `Overall tone requested: ${i.tone}\n` +
        `Desired length: ${i.length}\n` +
        `Style for THIS draft: ${style.title} (${style.brief})\n` +
        `Anecdotes / memories to include:\n${anecdotes}\n\n` +
        'Write only the speech text.',
    },
  ];
}

export async function generateSpeeches(input: SpeechInput): Promise<{ drafts: Draft[] }> {
  const drafts = await Promise.all(
    STYLES.map(async (style) => {
      const text = await generateText(promptFor(style, input), {
        temperature: 0.75,
        max_tokens: 1400,
        mockResponder: () => composeByStyle(style.key, input),
      });
      return { style: style.key, title: style.title, text: text.trim() };
    }),
  );
  return { drafts };
}
