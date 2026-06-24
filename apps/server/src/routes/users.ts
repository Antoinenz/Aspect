import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../auth/guards.js';

interface CreateInviteBody {
  role?: unknown;
  /** Optional TTL in seconds; defaults to 7 days. */
  ttlSeconds?: unknown;
}

interface UpdateUserBody {
  role?: unknown;
}

function asRole(v: unknown): 'admin' | 'member' | null {
  return v === 'admin' || v === 'member' ? v : null;
}

/**
 * Admin endpoints for managing users and invites. All require an
 * authenticated admin session.
 */
export async function userManagementRoutes(app: FastifyInstance): Promise<void> {
  const guard = { onRequest: requireAdmin() };

  app.get('/api/users', guard, async () => {
    return { users: app.users.list() };
  });

  app.patch('/api/users/:id', guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as UpdateUserBody;
    const role = asRole(body.role);
    if (!role) return reply.code(400).send({ error: 'role must be admin or member' });
    const target = app.users.getById(id);
    if (!target) return reply.code(404).send({ error: 'User not found.' });
    // Refuse to demote the only remaining admin — there must always be one.
    if (target.role === 'admin' && role === 'member') {
      const admins = app.users.list().filter((u) => u.role === 'admin').length;
      if (admins <= 1) {
        return reply.code(409).send({ error: 'Cannot demote the only remaining admin.' });
      }
    }
    app.users.setRole(id, role);
    return { user: { ...app.users.getById(id)! } };
  });

  app.delete('/api/users/:id', guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const me = request.user!;
    if (id === me.id) return reply.code(400).send({ error: 'You cannot delete yourself.' });
    const target = app.users.getById(id);
    if (!target) return reply.code(404).send({ error: 'User not found.' });
    if (target.role === 'admin') {
      const admins = app.users.list().filter((u) => u.role === 'admin').length;
      if (admins <= 1) {
        return reply.code(409).send({ error: 'Cannot delete the only remaining admin.' });
      }
    }
    app.users.delete(id);
    app.sessions.deleteByUser(id);
    return { ok: true };
  });

  app.get('/api/invites', guard, async () => {
    return { invites: app.invites.list() };
  });

  app.post('/api/invites', guard, async (request, reply) => {
    const body = (request.body ?? {}) as CreateInviteBody;
    const role = asRole(body.role) ?? 'member';
    const ttlSeconds = typeof body.ttlSeconds === 'number' && body.ttlSeconds > 0
      ? Math.floor(body.ttlSeconds)
      : null;
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
    const invite = app.invites.create({
      role,
      createdBy: request.user!.id,
      ...(ttlMs !== undefined ? { ttlMs } : {}),
    });
    return reply.code(201).send({ invite });
  });

  app.delete('/api/invites/:token', guard, async (request, reply) => {
    const { token } = request.params as { token: string };
    app.invites.delete(token);
    return reply.code(200).send({ ok: true });
  });
}
