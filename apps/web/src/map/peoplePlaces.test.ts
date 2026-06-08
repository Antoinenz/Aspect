import { describe, it, expect } from 'vitest';
import { peoplePlaces } from './peoplePlaces.js';
import type { EntityState, RegistryEntry } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown>): EntityState => ({
  entityId: id, state: 'home', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

describe('peoplePlaces', () => {
  it('maps person and device_tracker entities with coordinates', () => {
    const entities: Record<string, EntityState> = {
      'person.alex': e('person.alex', { latitude: 51.5, longitude: -0.1, entity_picture: '/a.png', friendly_name: 'Alex' }),
      'device_tracker.phone': e('device_tracker.phone', { latitude: 40.7, longitude: -74, friendly_name: 'Work Phone' }),
    };
    const places = peoplePlaces(entities, []);
    expect(places).toHaveLength(2);
    const alex = places.find((p) => p.entityId === 'person.alex');
    expect(alex).toMatchObject({ name: 'Alex', lat: 51.5, lng: -0.1, picture: '/a.png' });
    const phone = places.find((p) => p.entityId === 'device_tracker.phone');
    expect(phone?.picture).toBeNull();
  });

  it('skips entities without numeric coordinates and other domains', () => {
    const entities: Record<string, EntityState> = {
      'person.nocoords': e('person.nocoords', { friendly_name: 'No GPS' }),
      'person.partial': e('person.partial', { latitude: 1 }),
      'person.stringcoords': e('person.stringcoords', { latitude: '1', longitude: '2' }),
      'light.lamp': e('light.lamp', { latitude: 1, longitude: 2 }),
    };
    expect(peoplePlaces(entities, [])).toHaveLength(0);
  });

  it('prefers the registry name and sorts by name', () => {
    const entities: Record<string, EntityState> = {
      'person.b': e('person.b', { latitude: 1, longitude: 1, friendly_name: 'Zoe' }),
      'person.a': e('person.a', { latitude: 2, longitude: 2, friendly_name: 'ignored' }),
    };
    const registry: RegistryEntry[] = [
      { entityId: 'person.a', deviceId: null, areaId: null, name: 'Adam', platform: 'person', entityCategory: null, hidden: false, disabled: false, deviceClass: null },
    ];
    const places = peoplePlaces(entities, registry);
    expect(places.map((p) => p.name)).toEqual(['Adam', 'Zoe']);
  });
});
