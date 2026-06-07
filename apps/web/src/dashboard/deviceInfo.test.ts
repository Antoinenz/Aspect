import { describe, it, expect } from 'vitest';
import { siblingReadings } from './deviceInfo.js';
import type { EntityState, RegistryEntry } from '@aspect/shared';

const e = (id: string, state: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state, attributes: attrs, lastChanged: 't', lastUpdated: 't',
});
const reg = (entityId: string, deviceId: string | null): RegistryEntry => ({
  entityId, deviceId, areaId: null, name: null, platform: 'demo',
  entityCategory: null, hidden: false, disabled: false, deviceClass: null,
});

describe('siblingReadings', () => {
  it('returns other entities on the same device, excluding the entity itself', () => {
    const entities = {
      'light.a': e('light.a', 'on'),
      'sensor.a_batt': e('sensor.a_batt', '42', { device_class: 'battery' }),
      'sensor.a_sig': e('sensor.a_sig', '-60', { device_class: 'signal_strength' }),
      'light.other': e('light.other', 'off'),
    };
    const registry = [reg('light.a', 'd1'), reg('sensor.a_batt', 'd1'), reg('sensor.a_sig', 'd1'), reg('light.other', 'd2')];
    const out = siblingReadings('light.a', entities, registry).map((x) => x.entityId).sort();
    expect(out).toEqual(['sensor.a_batt', 'sensor.a_sig']);
  });

  it('returns [] when the entity has no device', () => {
    const entities = { 'light.a': e('light.a', 'on') };
    expect(siblingReadings('light.a', entities, [reg('light.a', null)])).toEqual([]);
  });
});
