import { describe, it, expect } from 'vitest';
import { buildSummary } from './summary.js';
import type { EntityState, RegistryEntry } from '@aspect/shared';

const e = (id: string, state: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state, attributes: attrs, lastChanged: 't', lastUpdated: 't',
});
const reg = (entityId: string, name: string | null = null): RegistryEntry => ({
  entityId, name, deviceId: null, areaId: null, platform: 'demo',
  entityCategory: null, hidden: false, disabled: false, deviceClass: null,
});

describe('buildSummary', () => {
  it('summarizes climate range, security, playing, people, weather', () => {
    const entities = {
      'climate.a': e('climate.a', 'heat', { temperature: 21 }),
      'climate.b': e('climate.b', 'cool', { temperature: 23 }),
      'lock.front': e('lock.front', 'locked'),
      'lock.back': e('lock.back', 'unlocked'),
      'media_player.tv': e('media_player.tv', 'playing'),
      'person.sam': e('person.sam', 'home'),
      'person.alex': e('person.alex', 'not_home'),
      'weather.home': e('weather.home', 'sunny', { temperature: 19 }),
      'light.k': e('light.k', 'on'),
      'light.l': e('light.l', 'off'),
    };
    const s = buildSummary(entities, []);
    expect(s.climate).toEqual({ count: 2, range: '21–23°' });
    expect(s.security).toEqual({ locks: 2, unlocked: 1, openings: 0 });
    expect(s.playing).toBe(1);
    expect(s.people.map((p) => [p.name, p.home])).toEqual([['Sam', true], ['Alex', false]]);
    expect(s.weather).toEqual({ state: 'sunny', temp: '19°' });
    expect(s.lightsOn).toEqual(['light.k']);
    expect(s.thermostats).toEqual(['climate.a', 'climate.b']);
  });

  it('collects alerts: open contact, unlocked lock, low battery, safety', () => {
    const entities = {
      'binary_sensor.door': e('binary_sensor.door', 'on', { device_class: 'door' }),
      'binary_sensor.smoke': e('binary_sensor.smoke', 'on', { device_class: 'smoke' }),
      'lock.back': e('lock.back', 'unlocked'),
      'sensor.batt': e('sensor.batt', '8', { device_class: 'battery' }),
      'sensor.batt_ok': e('sensor.batt_ok', '90', { device_class: 'battery' }),
    };
    const registry = [reg('binary_sensor.door', 'Front Door'), reg('sensor.batt', 'Sensor Battery')];
    const kinds = buildSummary(entities, registry).alerts.map((a) => a.kind).sort();
    expect(kinds).toEqual(['battery', 'open', 'safety', 'unlocked']);
    const door = buildSummary(entities, registry).alerts.find((a) => a.kind === 'open');
    expect(door?.name).toBe('Front Door');
  });

  it('returns empty/null sections when nothing matches', () => {
    const s = buildSummary({}, []);
    expect(s.climate).toBeNull();
    expect(s.security).toBeNull();
    expect(s.playing).toBe(0);
    expect(s.people).toEqual([]);
    expect(s.weather).toBeNull();
    expect(s.alerts).toEqual([]);
    expect(s.lightsOn).toEqual([]);
  });
});
