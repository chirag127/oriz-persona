/** oriz-persona core types + pure logic. Framework-agnostic, unit-tested. */

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  traits: string[];
  voice: string;
  greeting: string;
  scenario: string;
  accent: string; // hex, drives the card frame
  emoji: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const VOICES = [
  'Warm & encouraging',
  'Witty & sarcastic',
  'Formal & scholarly',
  'Chaotic & playful',
  'Calm & wise',
  'Dramatic & theatrical',
  'Blunt & deadpan',
  'Flirty & charming',
] as const;

export const ACCENTS = ['#ff2d93', '#22d3ee', '#7c3aed', '#ffb703', '#22c55e', '#f97316'];

const EMOJIS = ['🦊', '🐉', '🧙', '🤖', '🦉', '🐙', '👽', '🦄', '🐻', '🕵️', '🧛', '🧚'];

let seq = 0;
export function uid(): string {
  seq = (seq + 1) % 1e6;
  return `${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function pickEmoji(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return EMOJIS[h % EMOJIS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function emptyPersona(): Persona {
  return {
    id: uid(),
    name: '',
    tagline: '',
    traits: [],
    voice: VOICES[0],
    greeting: '',
    scenario: '',
    accent: ACCENTS[0],
    emoji: EMOJIS[0],
    createdAt: Date.now(),
  };
}

/** Build the g4f system prompt from a persona. */
export function buildSystemPrompt(p: Persona): string {
  const name = p.name.trim() || 'the character';
  const lines: string[] = [
    `You are ${name}, a fictional character in a roleplay chat. Stay fully in character at all times — never break character, never mention being an AI or a language model.`,
  ];
  if (p.tagline.trim()) lines.push(`Concept: ${p.tagline.trim()}.`);
  if (p.traits.length) lines.push(`Personality traits: ${p.traits.join(', ')}.`);
  if (p.voice) lines.push(`Speaking voice / tone: ${p.voice}.`);
  if (p.scenario.trim()) lines.push(`Current scene / setting: ${p.scenario.trim()}.`);
  lines.push(
    `Reply as ${name} would: keep responses conversational and in-character, 1-4 short paragraphs. Use *asterisks* for physical actions when it fits. Do not narrate for the user.`,
  );
  return lines.join('\n');
}

export function validatePersona(p: Persona): string[] {
  const errs: string[] = [];
  if (!p.name.trim()) errs.push('Name is required');
  if (p.name.length > 60) errs.push('Name too long (max 60)');
  if (p.traits.length > 12) errs.push('Too many traits (max 12)');
  return errs;
}
