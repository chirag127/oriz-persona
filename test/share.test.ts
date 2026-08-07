import { describe, it, expect } from 'vitest';
import { encodePersona, decodePersona, shareUrl, readShared } from '../src/lib/share';
import type { Persona } from '../src/lib/persona';

const p: Persona = {
  id: 'abc', name: 'Vera Sable', tagline: 'noir detective',
  traits: ['observant', 'sardonic'], voice: 'Witty & sarcastic',
  greeting: 'Sit down.', scenario: '1947 office', accent: '#7c3aed',
  emoji: '🕵️', createdAt: 12345,
};

describe('share codec', () => {
  it('round-trips a persona', () => {
    const t = encodePersona(p);
    expect(decodePersona(t)).toEqual(p);
  });
  it('produces a URL-safe token (no raw spaces or quotes)', () => {
    const t = encodePersona(p);
    expect(t).not.toMatch(/[ "'<>]/);
  });
  it('returns null on garbage', () => {
    expect(decodePersona('not-a-token!!')).toBeNull();
    expect(decodePersona('')).toBeNull();
  });
  it('shareUrl embeds the token and origin', () => {
    const url = shareUrl(p, 'https://persona.oriz.in/');
    expect(url.startsWith('https://persona.oriz.in/?p=')).toBe(true);
    const parsed = readShared(new URL(url).search);
    expect(parsed?.name).toBe('Vera Sable');
  });
  it('readShared returns null when no param', () => {
    expect(readShared('?x=1')).toBeNull();
  });
  it('compresses better than raw JSON for a rich persona', () => {
    const big = { ...p, scenario: 'x'.repeat(400) };
    expect(encodePersona(big).length).toBeLessThan(JSON.stringify(big).length);
  });
});
