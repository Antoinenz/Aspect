import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { clientChannel } from './ws/clientChannel.js';
import { registerStatic } from './static.js';
import { HaCache } from './cache/haCache.js';
import { FavoritesStore } from './db/favoritesStore.js';

export interface BuildAppOptions {
  webDir?: string | null;
  /** Inject a cache (tests); a fresh one is created when omitted. */
  cache?: HaCache;
  /** Inject a store (tests); an in-memory one is created when omitted. */
  favorites?: FavoritesStore;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const cache = opts.cache ?? new HaCache();
  const favorites = opts.favorites ?? new FavoritesStore(':memory:');
  const app = Fastify({ logger: false });
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(clientChannel, { cache, favorites });
  await registerStatic(app, opts.webDir ?? null);
  return app;
}
