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
    // Anything that's clearly an API/transport route must 404 cleanly rather
    // than be shadowed by index.html. Otherwise typos in admin calls and
    // probing tools see a 200 with the SPA shell and misread it as success.
    if (
      req.url === '/ws' ||
      req.url.startsWith('/health') ||
      req.url.startsWith('/api/')
    ) {
      reply.code(404).send({ error: 'not found' });
      return;
    }
    reply.sendFile('index.html');
  });
}
