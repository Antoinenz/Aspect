import { describe, it, expect } from 'vitest';
import { DEVICE_CLASS_RULES, NAME_RULES, FALLBACK_RULES, ICONS, FAN_NAME_PATTERNS } from './airAndClimate.js';
import type { AirClimateKind, ClassifyContext } from './types.js';

const ctx = (overrides: Partial<ClassifyContext> = {}): ClassifyContext => ({
  domain: 'fan', deviceClass: null, name: '', ...overrides,
});

function classify(c: ClassifyContext): AirClimateKind | null {
  for (const rule of [...DEVICE_CLASS_RULES, ...NAME_RULES, ...FALLBACK_RULES]) {
    if (rule.test(c)) return rule.kind as AirClimateKind;
  }
  return null;
}

describe('air & climate rules', () => {
  it('detects an extractor fan by name (the Lights → Climate fix)', () => {
    expect(classify(ctx({ name: 'extractor fan' }))).toBe('extractor_fan');
    expect(classify(ctx({ name: 'bathroom exhaust fan' }))).toBe('extractor_fan');
  });

  it('detects ceiling fan and air purifier by name, falls back to fan_generic', () => {
    expect(classify(ctx({ name: 'living room ceiling fan' }))).toBe('ceiling_fan');
    expect(classify(ctx({ name: 'bedroom air purifier' }))).toBe('air_purifier');
    expect(classify(ctx({ name: 'desk fan' }))).toBe('fan_generic');
  });

  it('detects a TRV vs a thermostat by name, else climate_generic', () => {
    expect(classify(ctx({ domain: 'climate', name: 'living room radiator' }))).toBe('trv');
    expect(classify(ctx({ domain: 'climate', name: 'hallway thermostat' }))).toBe('thermostat');
    expect(classify(ctx({ domain: 'climate', name: 'office climate' }))).toBe('climate_generic');
  });

  it('detects shading covers by device_class, falls back to cover_generic', () => {
    expect(classify(ctx({ domain: 'cover', deviceClass: 'blind' }))).toBe('blind');
    expect(classify(ctx({ domain: 'cover', deviceClass: 'shade' }))).toBe('blind');
    expect(classify(ctx({ domain: 'cover', deviceClass: 'curtain' }))).toBe('curtain');
    expect(classify(ctx({ domain: 'cover', deviceClass: 'shutter' }))).toBe('shutter');
    expect(classify(ctx({ domain: 'cover', deviceClass: 'awning' }))).toBe('awning');
    expect(classify(ctx({ domain: 'cover', deviceClass: 'damper' }))).toBe('damper');
    expect(classify(ctx({ domain: 'cover', name: 'office cover' }))).toBe('cover_generic');
  });

  it('detects shading covers by name when device_class is missing', () => {
    expect(classify(ctx({ domain: 'cover', name: 'lounge blind' }))).toBe('blind');
    expect(classify(ctx({ domain: 'cover', name: 'lounge curtain' }))).toBe('curtain');
  });

  it('detects climate sensors by device_class', () => {
    expect(classify(ctx({ domain: 'sensor', deviceClass: 'temperature' }))).toBe('temperature_sensor');
    expect(classify(ctx({ domain: 'sensor', deviceClass: 'humidity' }))).toBe('humidity_sensor');
    expect(classify(ctx({ domain: 'sensor', deviceClass: 'carbon_dioxide' }))).toBe('co2_sensor');
    expect(classify(ctx({ domain: 'sensor', deviceClass: 'pm25' }))).toBe('air_quality_sensor');
  });

  it('exposes the extractor_fan name pattern for reuse by the switch domain', () => {
    const extractor = FAN_NAME_PATTERNS.find(([, kind]) => kind === 'extractor_fan');
    expect(extractor?.[0].test('Extractor Fan')).toBe(true);
  });

  it('provides a non-empty icon for every air/climate kind', () => {
    for (const icon of Object.values(ICONS)) {
      expect(icon).toBeTruthy();
    }
  });
});
