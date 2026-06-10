import type { Room, RoomEntity } from './rooms.js';
import { classifyDevice, filterCategoryForKind } from '../domain/classify/index.js';
import type { FilterKind } from '../domain/classify/index.js';

export type { FilterKind };

function matchesFilter(re: RoomEntity, kind: FilterKind): boolean {
  return filterCategoryForKind(classifyDevice(re.entity)) === kind;
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
