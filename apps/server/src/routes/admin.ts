import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../auth/guards.js';

interface PatchBody {
  haUrl?: unknown;
  /** Optional. When omitted, the stored token is left untouched. */
  haToken?: unknown;
}

interface TestBody {
  haUrl?: unknown;
  haToken?: unknown;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Admin REST surface for managing the Home Assistant URL/token at runtime.
 *
 * Security note: there is no authentication here yet — the project as a
 * whole has none. Treat any client that can reach the server as fully
 * trusted, and gate network access at the reverse proxy / Tailscale level.
 *
 * The HA token is never returned by GET; it is opaquely stored. The admin
 * UI shows "Configured" / "Not configured" instead.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const adminGuard = { onRequest: requireAdmin() };

  app.get('/api/admin/settings', adminGuard, async () => {
    return app.haSupervisor.status();
  });

  app.put('/api/admin/settings', adminGuard, async (request, reply) => {
    const body = (request.body ?? {}) as PatchBody;
    const haUrl = trimOrNull(body.haUrl);
    if (!haUrl) {
      return reply.code(400).send({ error: 'haUrl is required' });
    }
    if (!isValidHttpUrl(haUrl)) {
      return reply.code(400).send({ error: 'haUrl must be a valid http(s) URL' });
    }

    // Token: omitted ⇒ keep existing; explicit empty string ⇒ no override.
    let tokenPatch: { haToken?: string | null } = {};
    if (body.haToken !== undefined) {
      const tok = trimOrNull(body.haToken);
      tokenPatch = { haToken: tok };
    }

    app.serverSettings.patch({ haUrl, ...tokenPatch });

    // Reconnect in the background — don't make the HTTP response wait on a
    // potentially slow HA handshake (the admin UI polls the status endpoint
    // to learn the outcome).
    void app.haSupervisor.reconnect();

    return app.haSupervisor.status();
  });

  app.delete('/api/admin/settings', adminGuard, async () => {
    app.serverSettings.clear();
    void app.haSupervisor.reconnect();
    return app.haSupervisor.status();
  });

  app.post('/api/admin/test-connection', adminGuard, async (request, reply) => {
    const body = (request.body ?? {}) as TestBody;
    const haUrl = trimOrNull(body.haUrl);
    const haToken = trimOrNull(body.haToken);
    if (!haUrl || !haToken) {
      return reply.code(400).send({ ok: false, error: 'haUrl and haToken are required' });
    }
    if (!isValidHttpUrl(haUrl)) {
      return reply.code(400).send({ ok: false, error: 'haUrl must be a valid http(s) URL' });
    }
    try {
      await app.haSupervisor.test(haUrl, haToken);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(200).send({ ok: false, error: message });
    }
  });
}
