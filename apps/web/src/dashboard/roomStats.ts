import { isActive } from '../domain/entities.js';
import type { Room } from './rooms.js';

export interface RoomStat {
  areaId: string;
  name: string;
  deviceCount: number;
  onCount: number;
}

export function roomsOverview(rooms: Room[]): RoomStat[] {
  const isDevice = (re: Room['entities'][number]): boolean =>
    re.domain !== 'scene' && re.domain !== 'script';

  return rooms.map((room) => ({
    areaId: room.areaId,
    name: room.name,
    deviceCount: room.entities.filter(isDevice).length,
    onCount: room.entities.filter((re) => isDevice(re) && isActive(re.entity)).length,
  }));
}
