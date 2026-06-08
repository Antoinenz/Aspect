import type { EntityState, RegistryEntry } from '@aspect/shared';
import { friendlyName, domainOf } from '../domain/entities.js';

/** A located person/tracker rendered as a map marker. */
export interface Place {
  entityId: string;
  name: string;
  lat: number;
  lng: number;
  /** `entity_picture` URL (person avatar) when available. */
  picture: string | null;
}

const LOCATABLE = new Set(['person', 'device_tracker']);

function numericAttr(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Pure: turns the entity map into a list of map markers — every `person` and
 * `device_tracker` that exposes numeric `latitude`/`longitude` attributes.
 * Sorted by name for a stable render; `registry` supplies friendly names.
 */
export function peoplePlaces(
  entities: Record<string, EntityState>,
  registry: RegistryEntry[],
): Place[] {
  const names = new Map<string, string | null>();
  for (const r of registry) names.set(r.entityId, r.name);

  const places: Place[] = [];
  for (const entity of Object.values(entities)) {
    if (!LOCATABLE.has(domainOf(entity.entityId))) continue;
    const lat = numericAttr(entity.attributes.latitude);
    const lng = numericAttr(entity.attributes.longitude);
    if (lat === null || lng === null) continue;

    const picture = entity.attributes.entity_picture;
    places.push({
      entityId: entity.entityId,
      name: friendlyName(entity, names.get(entity.entityId) ?? null),
      lat,
      lng,
      picture: typeof picture === 'string' && picture.length > 0 ? picture : null,
    });
  }

  return places.sort((a, b) => a.name.localeCompare(b.name));
}
