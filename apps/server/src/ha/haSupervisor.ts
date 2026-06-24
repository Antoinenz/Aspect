import {
  createConnection,
  createLongLivedTokenAuth,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_HTTPS_TO_HTTP,
} from 'home-assistant-js-websocket';
import type { HaCache } from '../cache/haCache.js';
import type { ClientHub } from '../ws/clientChannel.js';
import type { ServerSettingsStore } from '../db/serverSettingsStore.js';
import { startHaConnection, type HaConnectionHandle } from './connection.js';

/**
 * `home-assistant-js-websocket` rejects connection promises with a numeric
 * enum, not an Error. Translate the known codes to something the admin UI
 * can show without leaking internals.
 */
function formatHaError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'number') {
    switch (err) {
      case ERR_CANNOT_CONNECT: return 'Cannot reach Home Assistant at that URL.';
      case ERR_INVALID_AUTH: return 'Home Assistant rejected the token.';
      case ERR_CONNECTION_LOST: return 'Connection to Home Assistant was lost.';
      case ERR_HASS_HOST_REQUIRED: return 'Home Assistant URL is required.';
      case ERR_INVALID_HTTPS_TO_HTTP: return 'Cannot reach an http:// Home Assistant from an https:// page.';
      default: return `Home Assistant returned error code ${err}.`;
    }
  }
  return String(err);
}

export type ConfigSource = 'db' | 'env' | 'none';

export interface EffectiveHaConfig {
  url: string | null;
  /** True if a token is set at the effective source — never exposes the token itself. */
  hasToken: boolean;
  source: ConfigSource;
}

export interface SupervisorStatus {
  haConnected: boolean;
  /** Set when the most recent connect attempt failed; cleared on the next success. */
  lastError: string | null;
  effective: EffectiveHaConfig;
  envHasUrl: boolean;
  envHasToken: boolean;
}

/**
 * Owns the Home Assistant connection lifecycle and lets the admin API
 * rebuild it on demand (URL/token changes).
 *
 * Reads its effective config from either the SQLite store (admin-configured)
 * or process.env (boot config). DB overrides env when both are present.
 *
 * All start/stop/reconnect operations are serialized via an internal queue
 * so two overlapping admin saves can't race the underlying socket.
 */
export class HaSupervisor {
  private current: HaConnectionHandle | null = null;
  private connecting: Promise<HaConnectionHandle> | null = null;
  private lastError: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly env: { url: string | null; token: string | null },
    private readonly store: ServerSettingsStore,
    private readonly cache: HaCache,
    private readonly hub: ClientHub,
  ) {}

  /** Compute the URL/token currently in effect (does not connect). */
  effective(): { url: string | null; token: string | null; source: ConfigSource } {
    const stored = this.store.get();
    if (stored.haUrl && stored.haToken) {
      return { url: stored.haUrl, token: stored.haToken, source: 'db' };
    }
    if (this.env.url && this.env.token) {
      return { url: this.env.url, token: this.env.token, source: 'env' };
    }
    return { url: stored.haUrl ?? this.env.url, token: null, source: 'none' };
  }

  /** Snapshot for the admin GET endpoint. Never returns tokens. */
  status(): SupervisorStatus {
    const eff = this.effective();
    return {
      haConnected: this.current !== null && this.lastError === null,
      lastError: this.lastError,
      effective: {
        url: eff.url,
        hasToken: eff.token !== null,
        source: eff.source,
      },
      envHasUrl: this.env.url !== null && this.env.url !== '',
      envHasToken: this.env.token !== null && this.env.token !== '',
    };
  }

  /** Boot: connect using the effective config (no-op when nothing configured). */
  start(): Promise<void> {
    return this.serialize(() => this.connect());
  }

  /**
   * Tear down the current connection and reopen with the latest effective
   * config. Used by the admin endpoints after they patch the store.
   */
  reconnect(): Promise<void> {
    return this.serialize(async () => {
      await this.closeCurrent();
      await this.connect();
    });
  }

  /**
   * Verify a URL+token by opening a one-shot connection that is closed
   * immediately. Does not touch the live cache/hub. Throws on failure with
   * a human-readable message.
   */
  async test(url: string, token: string): Promise<void> {
    const auth = createLongLivedTokenAuth(url, token);
    try {
      const conn = await createConnection({ auth });
      conn.close();
    } catch (err) {
      throw new Error(formatHaError(err));
    }
  }

  /** Tear down the current connection without reopening. */
  stop(): Promise<void> {
    return this.serialize(() => this.closeCurrent());
  }

  private async connect(): Promise<void> {
    const eff = this.effective();
    if (!eff.url || !eff.token) {
      // Nothing to connect to. Make sure clients see the degraded state.
      this.hub.setStatus('degraded', false);
      this.current = null;
      this.lastError = null;
      return;
    }
    this.connecting = startHaConnection({
      url: eff.url,
      token: eff.token,
      cache: this.cache,
      hub: this.hub,
    });
    try {
      const h = await this.connecting;
      this.hub.setServiceCaller(h.callService);
      this.current = h;
      this.lastError = null;
    } catch (err) {
      this.hub.setStatus('degraded', false);
      this.current = null;
      this.lastError = formatHaError(err);
    } finally {
      this.connecting = null;
    }
  }

  private async closeCurrent(): Promise<void> {
    // If a connection is mid-flight, await it before closing so we don't
    // leak the socket that's about to resolve.
    if (this.connecting) {
      try {
        const h = await this.connecting;
        h.stop();
      } catch {
        /* connect failed; nothing to close */
      }
      this.connecting = null;
    } else if (this.current) {
      this.current.stop();
    }
    this.current = null;
  }

  /** Chain ops onto a single in-order queue. Errors don't poison the queue. */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
