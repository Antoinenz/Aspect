import type { EntityState } from '@aspect/shared';
import { domainOf } from './entities.js';
import { callService } from '../server-client/commands.js';

type Optimistic = (id: string, patch: { state?: string; attributes?: Record<string, unknown> }) => void;

/**
 * Returns the quick-action callback for a tile icon press, or null if the
 * domain has no meaningful single-tap toggle (climate, sensors, media, etc.).
 * Unavailable / unknown entities always return null.
 */
export function tileAction(entity: EntityState, optimistic: Optimistic): (() => void) | null {
  const id = entity.entityId;
  const domain = domainOf(id);
  const { state } = entity;

  if (state === 'unavailable' || state === 'unknown') return null;

  switch (domain) {
    case 'light': {
      const on = state === 'on';
      return () => { optimistic(id, { state: on ? 'off' : 'on' }); callService('light', on ? 'turn_off' : 'turn_on', id); };
    }
    case 'switch': {
      const on = state === 'on';
      return () => { optimistic(id, { state: on ? 'off' : 'on' }); callService('switch', on ? 'turn_off' : 'turn_on', id); };
    }
    case 'fan': {
      const on = state === 'on';
      return () => { optimistic(id, { state: on ? 'off' : 'on' }); callService('fan', on ? 'turn_off' : 'turn_on', id); };
    }
    case 'lock': {
      const locked = state === 'locked';
      return () => { optimistic(id, { state: locked ? 'unlocked' : 'locked' }); callService('lock', locked ? 'unlock' : 'lock', id); };
    }
    case 'cover': {
      const open = state === 'open';
      return () => { optimistic(id, { state: open ? 'closed' : 'open' }); callService('cover', open ? 'close_cover' : 'open_cover', id); };
    }
    case 'scene':
      return () => callService('scene', 'turn_on', id);
    case 'script':
      return () => callService('script', 'turn_on', id);
    default:
      return null;
  }
}
