import { classifyDevice, iconForKind, tintForKind } from './classify/index.js';
import type { EntityState } from '@aspect/shared';

/** Best MDI path for an entity, based on its detected DeviceKind. */
export function iconFor(entity: EntityState): string {
  return iconForKind(classifyDevice(entity));
}

/** Subtle icon tint by filter category (Apple-style); null = neutral. */
export function tintFor(entity: EntityState): string | null {
  return tintForKind(classifyDevice(entity));
}
