import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { clientChannel } from './ws/clientChannel.js';
import { registerStatic } from './static.js';
import { HaCache } from './cache/haCache.js';

export interface BuildAppOptions {
  webDir?: string | null;
  /** Inject a cache (tests); a fresh one is created when omitted. */
  cache?: HaCache;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const cache = opts.cache ?? new HaCache();
  const app = Fastify({ logger: false });
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(clientChannel, { cache });
  await registerStatic(app, opts.webDir ?? null);
  return app;
}
