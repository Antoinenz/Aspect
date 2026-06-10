import { describe, it, expect } from 'vitest';
import { classifyByIconAttr } from './iconAttr.js';

describe('classifyByIconAttr', () => {
  it('maps known, specific icon slugs to a kind', () => {
    expect(classifyByIconAttr('mdi:ceiling-light')).toBe('ceiling_light');
    expect(classifyByIconAttr('mdi:television')).toBe('tv');
    expect(classifyByIconAttr('mdi:ceiling-fan')).toBe('ceiling_fan');
  });

  it('returns null for generic or unknown icons', () => {
    expect(classifyByIconAttr('mdi:lightbulb')).toBeNull();
    expect(classifyByIconAttr('mdi:something-unknown')).toBeNull();
  });

  it('returns null when there is no icon attribute', () => {
    expect(classifyByIconAttr(null)).toBeNull();
  });
});
