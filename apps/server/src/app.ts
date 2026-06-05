import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { statusChannel } from './ws/statusChannel.js';
import { registerStatic } from './static.js';

export interface BuildAppOptions {
  webDir?: string | null;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(statusChannel);
  await registerStatic(app, opts.webDir ?? null);
  return app;
}
