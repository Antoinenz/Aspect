import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';
import { domainOf, friendlyName, isSupported } from '../domain/entities.js';

export interface RoomEntity {
  entity: EntityState;
  name: string;
  domain: string;
  /** Battery % for this entity's device, shown only on the device's primary tile. */
  battery: number | null;
  /** Render as a 2-column wide tile (climate, media). */
  wide: boolean;
}

export interface Room {
  areaId: string;
  name: string;
  entities: RoomEntity[];
}

const UNASSIGNED = '__unassigned__';
const WIDE_DOMAINS = new Set(['climate', 'media_player']);
const NOISE_DOMAINS = new Set([
  'update', 'event', 'conversation', 'tts', 'stt', 'sun', 'zone',
  'persistent_notification', 'device_tracker', 'person', 'image',
]);

/** Priority for choosing a device's primary (battery-bearing) tile. */
const PRIORITY: Record<string, number> = {
  light: 0, climate: 1, cover: 2, lock: 3, fan: 4, switch: 5, media_player: 6,
};
const priorityOf = (id: string): number => PRIORITY[domainOf(id)] ?? 50;

function isVisible(entity: EntityState, reg: RegistryEntry | undefined): boolean {
  if (reg?.hidden || reg?.disabled) return false;
  if (reg?.entityCategory === 'diagnostic' || reg?.entityCategory === 'config') return false;
  const domain = domainOf(entity.entityId);
  if (NOISE_DOMAINS.has(domain)) return false;
  return isSupported(entity.entityId) || domain === 'media_player';
}

function batteryOf(entity: EntityState): number | null {
  if (entity.attributes.device_class !== 'battery') return null;
  const n = Number(entity.state);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function buildRooms(
  entities: Record<string, EntityState>,
  areas: Area[],
  devices: Device[],
  registry: RegistryEntry[],
): Room[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceById = new Map(devices.map((d) => [d.deviceId, d]));
  const areaName = new Map(areas.map((a) => [a.areaId, a.name]));
  const all = Object.values(entities);

  // Per-device battery (from any battery entity belonging to the device).
  const deviceBattery = new Map<string, number>();
  for (const entity of all) {
    const reg = regByEntity.get(entity.entityId);
    const batt = batteryOf(entity);
    if (reg?.deviceId && batt !== null) deviceBattery.set(reg.deviceId, batt);
  }

  // Visible tiles, with their resolved area + device.
  interface Pending { entity: EntityState; areaId: string; deviceId: string | null; reg: RegistryEntry | undefined; }
  const pending: Pending[] = [];
  for (const entity of all) {
    const reg = regByEntity.get(entity.entityId);
    if (!isVisible(entity, reg)) continue;
    const deviceArea = reg?.deviceId ? (deviceById.get(reg.deviceId)?.areaId ?? null) : null;
    const areaId = reg?.areaId ?? deviceArea ?? UNASSIGNED;
    pending.push({ entity, areaId, deviceId: reg?.deviceId ?? null, reg });
  }

  // The primary (highest-priority) visible entity per device carries the battery.
  const primaryByDevice = new Map<string, string>();
  for (const p of pending) {
    if (!p.deviceId) continue;
    const cur = primaryByDevice.get(p.deviceId);
    if (cur === undefined || priorityOf(p.entity.entityId) < priorityOf(cur)) {
      primaryByDevice.set(p.deviceId, p.entity.entityId);
    }
  }

  const byArea = new Map<string, RoomEntity[]>();
  for (const p of pending) {
    const domain = domainOf(p.entity.entityId);
    const isPrimary = p.deviceId !== null && primaryByDevice.get(p.deviceId) === p.entity.entityId;
    const battery = isPrimary && p.deviceId ? (deviceBattery.get(p.deviceId) ?? null) : null;
    const re: RoomEntity = {
      entity: p.entity,
      name: friendlyName(p.entity, p.reg?.name ?? null),
      domain,
      battery,
      wide: WIDE_DOMAINS.has(domain),
    };
    const list = byArea.get(p.areaId);
    if (list) list.push(re); else byArea.set(p.areaId, [re]);
  }

  const byName = (a: RoomEntity, b: RoomEntity): number => a.name.localeCompare(b.name);
  const rooms: Room[] = [];
  for (const [areaId, list] of byArea) {
    if (areaId === UNASSIGNED) continue;
    rooms.push({ areaId, name: areaName.get(areaId) ?? areaId, entities: list.sort(byName) });
  }
  rooms.sort((a, b) => a.name.localeCompare(b.name));
  const other = byArea.get(UNASSIGNED);
  if (other && other.length) rooms.push({ areaId: UNASSIGNED, name: 'Other', entities: other.sort(byName) });
  return rooms;
}
