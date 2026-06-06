import { isServerToClientMessage } from '@aspect/shared';
import { useConnectionStore } from '../store/connectionStore.js';

/**
 * Parses a raw socket payload and applies it to the store. Pure with respect
 * to the socket: safe to unit-test without a live connection. Silently ignores
 * anything that is not a recognized server message.
 */
export function handleRawMessage(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!isServerToClientMessage(parsed)) return;

  const store = useConnectionStore.getState();
  switch (parsed.type) {
    case 'status':
      store.applyStatus(parsed.status, parsed.haConnected);
      return;
    case 'snapshot':
      store.applySnapshot({
        entities: parsed.entities,
        areas: parsed.areas,
        devices: parsed.devices,
        registry: parsed.registry,
      });
      return;
    case 'entity_update':
      store.applyEntityUpdate(parsed.entities, parsed.removed);
      return;
  }
}
