import { isServerToClientMessage } from '@aspect/shared';
import { useConnectionStore } from '../store/connectionStore.js';

/**
 * Parses a raw socket payload and applies it to the store. Pure with respect
 * to the socket: safe to unit-test without a live connection. Silently
 * ignores anything that is not a recognized server message.
 */
export function handleRawMessage(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!isServerToClientMessage(parsed)) return;
  if (parsed.type === 'status') {
    useConnectionStore.getState().applyStatus(parsed.status, parsed.haConnected);
  }
}
