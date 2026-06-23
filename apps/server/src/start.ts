import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import type { AspectConfig } from './config.js';
import { startHaConnection } from './ha/connection.js';
import { FavoritesStore } from './db/favoritesStore.js';

/**
 * Builds the app, starts listening, and (if configured) connects to Home
 * Assistant. Returns the running Fastify instance. Exported separately from the
 * process entry point (server.ts) so it can be started and torn down in tests
 * without side effects on import.
 *
 * The `onClose` hook is registered BEFORE `listen()` — Fastify forbids adding
 * hooks once the instance is listening — and it stops the HA socket via a
 * mutable handle assigned after the connection is established.
 */
export async function startServer(
  config: AspectConfig,
): Promise<FastifyInstance> {
  const app = await buildApp({
    webDir: config.webDir,
    favorites: new FavoritesStore(config.dbPath),
  });

  // Track both the in-flight connection promise and the resolved stop handle so
  // onClose can cancel a connection that is still being established when the
  // server shuts down (avoids leaking the HA WebSocket and its reconnect timers).
  let haStop: (() => void) | null = null;
  let haConnecting: Promise<unknown> | null = null;
  app.addHook('onClose', async () => {
    await haConnecting?.catch(() => undefined);
    haStop?.();
  });

  await app.listen({ port: config.port, host: config.host });
  // eslint-disable-next-line no-console
  console.log(`Aspect server listening on http://${config.host}:${config.port}`);

  if (config.haUrl && config.haToken) {
    haConnecting = startHaConnection({
      url: config.haUrl,
      token: config.haToken,
      cache: app.haCache,
      hub: app.clientHub,
    });
    try {
      const ha = await haConnecting;
      app.clientHub.setServiceCaller(ha.callService);
      haStop = ha.stop;
      // eslint-disable-next-line no-console
      console.log(`Connected to Home Assistant at ${config.haUrl}`);
    } catch (err) {
      app.clientHub.setStatus('degraded', false);
      // eslint-disable-next-line no-console
      console.error('Failed to connect to Home Assistant:', err);
    } finally {
      haConnecting = null;
    }
  } else {
    app.clientHub.setStatus('degraded', false);
    // eslint-disable-next-line no-console
    console.warn(
      'HA_URL/HA_TOKEN not set — running without a Home Assistant connection.',
    );
  }

  return app;
}
