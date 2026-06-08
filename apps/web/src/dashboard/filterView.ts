import type { Room, RoomEntity } from './rooms.js';
import {
  SHADE_COVER_CLASSES,
  SECURITY_COVER_CLASSES,
  SECURITY_BINARY_SENSOR_CLASSES,
  CLIMATE_SENSOR_CLASSES,
} from '../domain/deviceClass.js';

export type FilterKind = 'lights' | 'climate' | 'security' | 'playing';

function matchesFilter(re: RoomEntity, kind: FilterKind): boolean {
  const dc = typeof re.entity.attributes.device_class === 'string'
    ? (re.entity.attributes.device_class as string)
    : null;
  switch (kind) {
    case 'lights':
      return re.domain === 'light' || re.domain === 'fan';
    case 'climate':
      return re.domain === 'climate'
        || (re.domain === 'cover' && dc !== null && SHADE_COVER_CLASSES.has(dc))
        || (re.domain === 'sensor' && dc !== null && CLIMATE_SENSOR_CLASSES.has(dc));
    case 'security':
      return re.domain === 'lock'
        || (re.domain === 'binary_sensor' && dc !== null && SECURITY_BINARY_SENSOR_CLASSES.has(dc))
        || (re.domain === 'cover' && dc !== null && SECURITY_COVER_CLASSES.has(dc));
    case 'playing':
      return re.domain === 'media_player';
  }
}

export interface FilteredRoom {
  areaId: string;
  name: string;
  entities: RoomEntity[];
}

export function filterRooms(rooms: Room[], kind: FilterKind): FilteredRoom[] {
  return rooms
    .map((room) => ({
      areaId: room.areaId,
      name: room.name,
      entities: room.entities.filter((re) => matchesFilter(re, kind)),
    }))
    .filter((r) => r.entities.length > 0);
}

/** Returns true if any room contains at least one entity matching the category. */
export function hasCategory(rooms: Room[], kind: FilterKind): boolean {
  return rooms.some((room) => room.entities.some((re) => matchesFilter(re, kind)));
}
