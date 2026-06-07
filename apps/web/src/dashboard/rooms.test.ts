import { describe, it, expect } from 'vitest';
import { buildRooms } from './rooms.js';
import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';

const e = (entityId: string, state = 'on', attributes: Record<string, unknown> = {}): EntityState => ({
  entityId, state, attributes, lastChanged: 't', lastUpdated: 't',
});
const reg = (
  entityId: string,
  opts: Partial<RegistryEntry> = {},
): RegistryEntry => ({
  entityId, areaId: null, deviceId: null, name: null, platform: 'demo',
  entityCategory: null, hidden: false, disabled: false, deviceClass: null, ...opts,
});

describe('buildRooms filtering', () => {
  it('hides diagnostic/config, hidden, disabled, and noise-domain entities', () => {
    const entities = {
      'light.a': e('light.a'),
      'sensor.cfg': e('sensor.cfg', '1'),
      'sensor.diag': e('sensor.diag', '1'),
      'sensor.hidden': e('sensor.hidden', '1'),
      'update.fw': e('update.fw', 'off'),
      'sensor.temp': e('sensor.temp', '21', { device_class: 'temperature' }),
    };
    const registry = [
      reg('light.a', { areaId: 'k' }),
      reg('sensor.cfg', { areaId: 'k', entityCategory: 'config' }),
      reg('sensor.diag', { areaId: 'k', entityCategory: 'diagnostic' }),
      reg('sensor.hidden', { areaId: 'k', hidden: true }),
      reg('sensor.temp', { areaId: 'k' }),
    ];
    const rooms = buildRooms(entities, [{ areaId: 'k', name: 'Kitchen' }], [], registry);
    const ids = rooms[0]!.entities.map((r) => r.entity.entityId).sort();
    expect(ids).toEqual(['light.a', 'sensor.temp']); // cfg/diag/hidden/update dropped
  });

  it('marks climate and media_player tiles as wide', () => {
    const entities = { 'climate.h': e('climate.h', 'heat'), 'media_player.tv': e('media_player.tv', 'playing') };
    const rooms = buildRooms(entities, [], [], []);
    const byId = Object.fromEntries(rooms[0]!.entities.map((r) => [r.entity.entityId, r]));
    expect(byId['climate.h']!.wide).toBe(true);
    expect(byId['media_player.tv']!.wide).toBe(true);
  });
});

describe('buildRooms battery', () => {
  it('attaches a device battery to that device primary tile, not the battery sensor itself', () => {
    const entities = {
      'light.a': e('light.a'),
      'sensor.a_batt': e('sensor.a_batt', '42', { device_class: 'battery' }),
    };
    const devices: Device[] = [{ deviceId: 'd1', name: 'Lamp', areaId: 'k' }];
    const registry = [
      reg('light.a', { deviceId: 'd1', areaId: 'k' }),
      reg('sensor.a_batt', { deviceId: 'd1', areaId: 'k', entityCategory: 'diagnostic', deviceClass: 'battery' }),
    ];
    const rooms = buildRooms(entities, [{ areaId: 'k', name: 'Kitchen' }], devices, registry);
    const tiles = rooms[0]!.entities;
    expect(tiles.map((t) => t.entity.entityId)).toEqual(['light.a']); // battery sensor not a tile
    expect(tiles[0]!.battery).toBe(42);
  });

  it('leaves battery null when the device has none', () => {
    const entities = { 'light.a': e('light.a') };
    const rooms = buildRooms(entities, [], [], [reg('light.a')]);
    expect(rooms[0]!.entities[0]!.battery).toBeNull();
  });
});
