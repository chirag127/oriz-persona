/** Shareable-URL codec: persona -> LZ-string compressed hash param. Pure. */
import lzString from 'lz-string';
import type { Persona } from './persona';

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;

const KEYS: (keyof Persona)[] = [
  'id', 'name', 'tagline', 'traits', 'voice', 'greeting', 'scenario', 'accent', 'emoji', 'createdAt',
];

/** Encode a persona to a compact URL-safe token. */
export function encodePersona(p: Persona): string {
  // positional array keeps the payload tiny vs. full JSON keys
  const arr = KEYS.map((k) => p[k]);
  return compressToEncodedURIComponent(JSON.stringify(arr));
}

/** Decode a token back to a persona; null if malformed. */
export function decodePersona(token: string): Persona | null {
  try {
    const json = decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length < 4) return null;
    const p = {} as Record<string, unknown>;
    KEYS.forEach((k, i) => (p[k] = arr[i]));
    if (typeof p.name !== 'string') return null;
    return {
      id: String(p.id ?? ''),
      name: String(p.name),
      tagline: String(p.tagline ?? ''),
      traits: Array.isArray(p.traits) ? p.traits.map(String) : [],
      voice: String(p.voice ?? ''),
      greeting: String(p.greeting ?? ''),
      scenario: String(p.scenario ?? ''),
      accent: String(p.accent ?? '#ff2d93'),
      emoji: String(p.emoji ?? '🦊'),
      createdAt: Number(p.createdAt ?? Date.now()),
    };
  } catch {
    return null;
  }
}

/** Full shareable URL for a persona (uses current origin at call time). */
export function shareUrl(p: Persona, origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/?p=${encodePersona(p)}`;
}

/** Read a persona token from a URL search string ("?p=..."). */
export function readShared(search: string): Persona | null {
  const m = /[?&]p=([^&]+)/.exec(search);
  return m ? decodePersona(decodeURIComponent(m[1])) : null;
}
