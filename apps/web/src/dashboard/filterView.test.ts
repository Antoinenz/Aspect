import { describe, it, expect } from 'vitest';
import { filterRooms, hasCategory } from './filterView.js';
import type { Room } from './rooms.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state: 'on', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

const room = (areaId: string, name: string, entities: EntityState[]): Room => ({
  areaId,
  name,
  entities: entities.map((entity) => ({
    entity, name: entity.attributes.friendly_name as string ?? entity.entityId,
    domain: entity.entityId.split('.')[0]!, battery: null, wide: false,
  })),
});

describe('filterRooms', () => {
  it('puts an extractor fan under climate, not lights', () => {
    const rooms: Room[] = [room('bathroom', 'Bathroom', [
      e('fan.bathroom_extractor', { friendly_name: 'Extractor Fan' }),
    ])];

    expect(filterRooms(rooms, 'climate')).toHaveLength(1);
    expect(filterRooms(rooms, 'lights')).toHaveLength(0);
  });

  it('puts a motion sensor under security', () => {
    const rooms: Room[] = [room('porch', 'Porch', [
      e('binary_sensor.porch_motion', { friendly_name: 'Porch Motion', device_class: 'motion' }),
    ])];

    expect(hasCategory(rooms, 'security')).toBe(true);
    expect(hasCategory(rooms, 'lights')).toBe(false);
  });

  it('puts a ceiling light under lights', () => {
    const rooms: Room[] = [room('hallway', 'Hallway', [
      e('light.hallway_ceiling', { friendly_name: 'Hallway Ceiling Light' }),
    ])];

    expect(hasCategory(rooms, 'lights')).toBe(true);
  });
});
