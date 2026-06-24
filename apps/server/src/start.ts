import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import type { AspectConfig } from './config.js';
import { FavoritesStore } from './db/favoritesStore.js';
import { ServerSettingsStore } from './db/serverSettingsStore.js';

/**
 * Builds the app, starts listening, and (if configured) connects to Home
 * Assistant via the supervisor. Returns the running Fastify instance.
 *
 * The `onClose` hook is registered BEFORE `listen()` — Fastify forbids
 * adding hooks once the instance is listening — and stops the supervisor,
 * which serializes against any in-flight (re)connect started by an admin
 * write.
 */
export async function startServer(
  config: AspectConfig,
): Promise<FastifyInstance> {
  const app = await buildApp({
    webDir: config.webDir,
    favorites: new FavoritesStore(config.dbPath),
    serverSettings: new ServerSettingsStore(config.dbPath),
    envHa: { url: config.haUrl, token: config.haToken },
  });

  app.addHook('onClose', async () => {
    await app.haSupervisor.stop();
  });

  await app.listen({ port: config.port, host: config.host });
  // eslint-disable-next-line no-console
  console.log(`Aspect server listening on http://${config.host}:${config.port}`);

  const status = app.haSupervisor.status();
  if (status.effective.source === 'none') {
    // eslint-disable-next-line no-console
    console.warn(
      'HA_URL/HA_TOKEN not set and no stored override — running without a Home Assistant connection. Configure via /api/admin/settings or the admin page.',
    );
  }

  // Kick off the initial connect in the background — don't make the HTTP
  // server's readiness wait on a potentially slow HA handshake.
  app.haSupervisor
    .start()
    .then(() => {
      const s = app.haSupervisor.status();
      if (s.haConnected) {
        // eslint-disable-next-line no-console
        console.log(`Connected to Home Assistant at ${s.effective.url}`);
      } else if (s.lastError) {
        // eslint-disable-next-line no-console
        console.error('Failed to connect to Home Assistant:', s.lastError);
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('HA supervisor start failed unexpectedly:', err);
    });

  return app;
}
