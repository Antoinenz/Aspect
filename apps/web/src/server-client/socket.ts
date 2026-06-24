import { createPingMessage, type ClientToServerMessage } from '@aspect/shared';
import { handleRawMessage } from './messageHandler.js';
import { useConnectionStore } from '../store/connectionStore.js';

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;
const PING_INTERVAL_MS = 5_000;
const PING_TIMEOUT_MS = 4_000;

let activeSocket: WebSocket | null = null;

/** Per-nonce sent-at timestamp; messageHandler resolves with the RTT. */
const pendingPings = new Map<number, number>();

/** Called from messageHandler when a `pong` arrives. Updates the store. */
export function recordPong(nonce: number): void {
  const sentAt = pendingPings.get(nonce);
  if (sentAt === undefined) return;
  pendingPings.delete(nonce);
  const rtt = Math.max(0, performance.now() - sentAt);
  useConnectionStore.getState().setPingMs(rtt);
}

/**
 * Maintains a resilient WebSocket to the Aspect server. Reconnects with
 * exponential backoff and routes every payload through handleRawMessage.
 * Returns a disposer that closes the socket and stops reconnecting.
 */
export function connectToServer(url?: string): () => void {
  const target = url ?? defaultUrl();
  let socket: WebSocket | null = null;
  let backoff = INITIAL_BACKOFF_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const stopPing = (): void => {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    pendingPings.clear();
  };

  const sendPing = (): void => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const nonce = Math.floor(Math.random() * 0xffffffff);
    pendingPings.set(nonce, performance.now());
    socket.send(JSON.stringify(createPingMessage(nonce)));
    // If no pong comes back, drop the entry (and let the next ping replace it).
    setTimeout(() => {
      if (pendingPings.has(nonce)) {
        pendingPings.delete(nonce);
        // Surfacing a very high "ping" is a useful signal that the link is
        // sluggish even when it's not fully dead.
        useConnectionStore.getState().setPingMs(PING_TIMEOUT_MS);
      }
    }, PING_TIMEOUT_MS);
  };

  const open = (): void => {
    useConnectionStore.getState().setLink('connecting');
    socket = new WebSocket(target);
    activeSocket = socket;

    socket.onopen = () => {
      backoff = INITIAL_BACKOFF_MS;
      useConnectionStore.getState().setLink('connected');
      // Probe immediately so the first reading appears quickly, then poll.
      sendPing();
      pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
    };
    socket.onmessage = (event) => handleRawMessage(String(event.data));
    socket.onclose = () => {
      if (activeSocket === socket) activeSocket = null;
      stopPing();
      useConnectionStore.getState().setLink('disconnected');
      useConnectionStore.getState().setPingMs(null);
      if (!disposed) scheduleReconnect();
    };
    socket.onerror = (event) => (event.target as WebSocket).close();
  };

  const scheduleReconnect = (): void => {
    const delay = backoff;
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    timer = setTimeout(open, delay);
  };

  open();

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    stopPing();
    socket?.close();
  };
}

function defaultUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

/** Sends a message to the Aspect server if the socket is open. Returns success. */
export function sendToServer(msg: ClientToServerMessage): boolean {
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    activeSocket.send(JSON.stringify(msg));
    return true;
  }
  return false;
}
