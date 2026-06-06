import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';
import { domainOf, friendlyName, isSupported } from '../domain/entities.js';

export interface RoomEntity {
  entity: EntityState;
  name: string;
  domain: string;
}

export interface Room {
  areaId: string;
  name: string;
  entities: RoomEntity[];
}

const UNASSIGNED = '__unassigned__';

/**
 * Joins entities to areas (directly via the entity registry, or indirectly via
 * the entity's device) and groups them into sorted rooms. Unsupported domains
 * are dropped; area-less entities land in a trailing "Other" room. Pure.
 */
export function buildRooms(
  entities: Record<string, EntityState>,
  areas: Area[],
  devices: Device[],
  registry: RegistryEntry[],
): Room[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceById = new Map(devices.map((d) => [d.deviceId, d]));
  const areaName = new Map(areas.map((a) => [a.areaId, a.name]));

  const byArea = new Map<string, RoomEntity[]>();

  for (const entity of Object.values(entities)) {
    if (!isSupported(entity.entityId)) continue;
    const reg = regByEntity.get(entity.entityId);
    const deviceArea = reg?.deviceId
      ? (deviceById.get(reg.deviceId)?.areaId ?? null)
      : null;
    const areaId = reg?.areaId ?? deviceArea ?? UNASSIGNED;

    const roomEntity: RoomEntity = {
      entity,
      name: friendlyName(entity, reg?.name ?? null),
      domain: domainOf(entity.entityId),
    };
    const list = byArea.get(areaId);
    if (list) list.push(roomEntity);
    else byArea.set(areaId, [roomEntity]);
  }

  const sortByName = (a: RoomEntity, b: RoomEntity): number =>
    a.name.localeCompare(b.name);

  const rooms: Room[] = [];
  for (const [areaId, list] of byArea) {
    if (areaId === UNASSIGNED) continue;
    rooms.push({
      areaId,
      name: areaName.get(areaId) ?? areaId,
      entities: list.sort(sortByName),
    });
  }
  rooms.sort((a, b) => a.name.localeCompare(b.name));

  const unassigned = byArea.get(UNASSIGNED);
  if (unassigned && unassigned.length > 0) {
    rooms.push({
      areaId: UNASSIGNED,
      name: 'Other',
      entities: unassigned.sort(sortByName),
    });
  }

  return rooms;
}
