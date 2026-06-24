import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { adminRoutes } from './routes/admin.js';
import { clientChannel } from './ws/clientChannel.js';
import { registerStatic } from './static.js';
import { HaCache } from './cache/haCache.js';
import { FavoritesStore } from './db/favoritesStore.js';
import { ServerSettingsStore } from './db/serverSettingsStore.js';
import { HaSupervisor } from './ha/haSupervisor.js';

export interface BuildAppOptions {
  webDir?: string | null;
  /** Inject a cache (tests); a fresh one is created when omitted. */
  cache?: HaCache;
  /** Inject a favorites store (tests); an in-memory one is created when omitted. */
  favorites?: FavoritesStore;
  /** Inject a server-settings store (tests); an in-memory one is created when omitted. */
  serverSettings?: ServerSettingsStore;
  /**
   * Env-derived boot config used by the HA supervisor as a fallback when no
   * stored override is present.
   */
  envHa?: { url: string | null; token: string | null };
  /** Inject a supervisor (tests). When omitted one is built around the store + env. */
  haSupervisor?: HaSupervisor;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const cache = opts.cache ?? new HaCache();
  const favorites = opts.favorites ?? new FavoritesStore(':memory:');
  const serverSettings = opts.serverSettings ?? new ServerSettingsStore(':memory:');

  const app = Fastify({ logger: false });
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(clientChannel, { cache, favorites });

  const supervisor =
    opts.haSupervisor ??
    new HaSupervisor(
      opts.envHa ?? { url: null, token: null },
      serverSettings,
      app.haCache,
      app.clientHub,
    );

  app.decorate('serverSettings', serverSettings);
  app.decorate('haSupervisor', supervisor);

  await app.register(adminRoutes);
  await registerStatic(app, opts.webDir ?? null);
  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    serverSettings: ServerSettingsStore;
    haSupervisor: HaSupervisor;
  }
}
