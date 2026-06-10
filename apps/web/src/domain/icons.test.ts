import { describe, it, expect } from 'vitest';
import { iconFor, tintFor } from './icons.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state: 'on', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

describe('iconFor', () => {
  it('returns a non-empty MDI path for known domains', () => {
    expect(iconFor(e('light.k'))).toBeTruthy();
    expect(iconFor(e('climate.k'))).toBeTruthy();
    expect(iconFor(e('lock.k'))).toBeTruthy();
  });

  it('uses device_class for sensors (temperature vs illuminance)', () => {
    expect(iconFor(e('sensor.t', { device_class: 'temperature' })))
      .not.toBe(iconFor(e('sensor.l', { device_class: 'illuminance' })));
  });

  it('falls back to a default path for unknown domains', () => {
    expect(iconFor(e('mystery.x'))).toBeTruthy();
  });
});

describe('tintFor', () => {
  it('tints lights amber and climate blue', () => {
    expect(tintFor(e('light.k'))).toBe('#ffd27d');
    expect(tintFor(e('climate.k'))).toBe('#86c2ff');
  });

  it('routes an extractor fan to the climate tint (Lights → Climate fix)', () => {
    expect(tintFor(e('fan.bathroom_extractor', { friendly_name: 'Extractor Fan' }))).toBe('#86c2ff');
  });

  it('returns null for media players', () => {
    expect(tintFor(e('media_player.tv'))).toBeNull();
  });
});
