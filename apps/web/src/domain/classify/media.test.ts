import { describe, it, expect } from 'vitest';
import { NAME_RULES, FALLBACK_RULES, ICONS } from './media.js';
import type { ClassifyContext, MediaKind } from './types.js';

const ctx = (overrides: Partial<ClassifyContext> = {}): ClassifyContext => ({
  domain: 'media_player', deviceClass: null, name: '', ...overrides,
});

function classify(c: ClassifyContext): MediaKind | null {
  for (const rule of [...NAME_RULES, ...FALLBACK_RULES]) {
    if (rule.test(c)) return rule.kind as MediaKind;
  }
  return null;
}

describe('media rules', () => {
  it('detects a TV by name', () => {
    expect(classify(ctx({ name: 'living room tv' }))).toBe('tv');
    expect(classify(ctx({ name: 'bedroom television' }))).toBe('tv');
  });

  it('detects a soundbar and receiver by name', () => {
    expect(classify(ctx({ name: 'tv soundbar' }))).toBe('soundbar');
    expect(classify(ctx({ name: 'av receiver' }))).toBe('receiver');
  });

  it('detects a speaker by name', () => {
    expect(classify(ctx({ name: 'kitchen speaker' }))).toBe('speaker');
  });

  it('falls back to media_generic', () => {
    expect(classify(ctx({ name: 'media player' }))).toBe('media_generic');
  });

  it('provides a non-empty icon for every media kind', () => {
    for (const icon of Object.values(ICONS)) {
      expect(icon).toBeTruthy();
    }
  });
});
