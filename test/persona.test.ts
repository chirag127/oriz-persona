import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  emptyPersona,
  initials,
  pickEmoji,
  uid,
  validatePersona,
  type Persona,
} from '../src/lib/persona';

const base: Persona = {
  id: 'x', name: 'Zed', tagline: 'space pirate', traits: ['bold', 'sly'],
  voice: 'Witty & sarcastic', greeting: 'yo', scenario: 'a docking bay',
  accent: '#ff2d93', emoji: '🦊', createdAt: 1,
};

describe('buildSystemPrompt', () => {
  it('embeds name, traits, voice, scenario', () => {
    const s = buildSystemPrompt(base);
    expect(s).toContain('You are Zed');
    expect(s).toContain('space pirate');
    expect(s).toContain('bold, sly');
    expect(s).toContain('Witty & sarcastic');
    expect(s).toContain('a docking bay');
  });
  it('falls back gracefully when fields blank', () => {
    const s = buildSystemPrompt({ ...base, name: '', tagline: '', traits: [], scenario: '' });
    expect(s).toContain('the character');
    expect(s).not.toContain('Personality traits:');
  });
  it('always forbids breaking character', () => {
    expect(buildSystemPrompt(base)).toMatch(/never mention being an AI/i);
  });
});

describe('initials', () => {
  it('single word', () => expect(initials('Zed')).toBe('ZE'));
  it('two words', () => expect(initials('Vera Sable')).toBe('VS'));
  it('empty', () => expect(initials('   ')).toBe('?'));
});

describe('uid', () => {
  it('is unique across calls', () => {
    const a = new Set(Array.from({ length: 500 }, () => uid()));
    expect(a.size).toBe(500);
  });
});

describe('pickEmoji', () => {
  it('is deterministic per seed', () => {
    expect(pickEmoji('Zed')).toBe(pickEmoji('Zed'));
  });
});

describe('validatePersona', () => {
  it('requires a name', () => {
    expect(validatePersona(emptyPersona())).toContain('Name is required');
  });
  it('passes a filled persona', () => {
    expect(validatePersona(base)).toEqual([]);
  });
  it('rejects too many traits', () => {
    const p = { ...base, traits: Array(13).fill('x') };
    expect(validatePersona(p)).toContain('Too many traits (max 12)');
  });
});
