import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

/** Starts the app on an ephemeral port and returns its base ws URL. */
export async function listen(app: FastifyInstance): Promise<string> {
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  // address looks like http://127.0.0.1:54321
  return address.replace('http://', 'ws://');
}

/**
 * Boot the app's first user (auto-admin) and return a `Cookie` header value
 * suitable for attaching to ws/http requests in tests.
 */
export async function bootstrapAdminCookie(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST', url: '/api/auth/signup',
    payload: { username: 'admin', password: 'longenough', displayName: 'Admin' },
  });
  const setCookie = res.headers['set-cookie'] as string | string[];
  const all = Array.isArray(setCookie) ? setCookie : [setCookie];
  return all.map((c) => c.split(';')[0]).join('; ');
}

/** Opens a ws connection and resolves with the first parsed JSON message. */
export function firstMessage(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.on('message', (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      } finally {
        socket.close();
      }
    });
    socket.on('error', reject);
  });
}
