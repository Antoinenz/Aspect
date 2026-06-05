import { existsSync } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

/**
 * Serves the built web app from `webDir` and falls back to index.html for
 * client-side routes. No-op when webDir is null (development uses Vite).
 */
export async function registerStatic(
  app: FastifyInstance,
  webDir: string | null,
): Promise<void> {
  if (!webDir || !existsSync(webDir)) return;
  await app.register(fastifyStatic, { root: path.resolve(webDir) });
  app.setNotFoundHandler((req, reply) => {
    if (req.url === '/ws' || req.url.startsWith('/health')) {
      reply.code(404).send({ error: 'not found' });
      return;
    }
    reply.sendFile('index.html');
  });
}
