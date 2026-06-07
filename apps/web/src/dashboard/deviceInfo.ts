import type { EntityState, RegistryEntry } from '@aspect/shared';

/**
 * Other entities that belong to the same device as `entityId` (its diagnostic /
 * secondary readings), excluding the entity itself. Pure.
 */
export function siblingReadings(
  entityId: string,
  entities: Record<string, EntityState>,
  registry: RegistryEntry[],
): EntityState[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceId = regByEntity.get(entityId)?.deviceId ?? null;
  if (!deviceId) return [];
  const out: EntityState[] = [];
  for (const entity of Object.values(entities)) {
    if (entity.entityId === entityId) continue;
    if (regByEntity.get(entity.entityId)?.deviceId === deviceId) out.push(entity);
  }
  return out;
}
