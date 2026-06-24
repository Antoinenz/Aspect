import type { onRequestHookHandler } from 'fastify';

/**
 * Returns a Fastify preHandler that 401s anonymous requests and 403s
 * authenticated requests with the wrong role.
 */
export function requireRole(...roles: ('admin' | 'member')[]): onRequestHookHandler {
  return async (request, reply) => {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Authentication required.' });
      return reply;
    }
    if (!roles.includes(user.role)) {
      reply.code(403).send({ error: 'Forbidden.' });
      return reply;
    }
  };
}

export const requireAdmin = (): onRequestHookHandler => requireRole('admin');
export const requireAuthed = (): onRequestHookHandler => requireRole('admin', 'member');
