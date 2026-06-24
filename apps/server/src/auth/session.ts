import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { UserRow, UsersStore } from '../db/usersStore.js';
import type { SessionsStore } from '../db/sessionsStore.js';

export const SESSION_COOKIE = 'aspect_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
}

/**
 * Attaches `request.user` from the signed session cookie. The hook is
 * permissive (no user ⇒ user is null); route-level guards enforce access.
 *
 * Sliding expiry: every authed request bumps the cookie's Max-Age so an
 * active family member doesn't get logged out mid-session.
 */
export function registerSessionMiddleware(
  app: FastifyInstance,
  users: UsersStore,
  sessions: SessionsStore,
): void {
  app.addHook('onRequest', async (request, reply) => {
    const cookies = request.cookies ?? {};
    const raw = cookies[SESSION_COOKIE];
    if (!raw) return;
    const unsigned = app.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return;
    const session = sessions.get(unsigned.value);
    if (!session) return;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      sessions.delete(session.id);
      return;
    }
    const user = users.getById(session.userId);
    if (!user) return;
    (request as FastifyRequest & { user: AuthenticatedUser | null }).user = {
      id: user.id, username: user.username, displayName: user.displayName, role: user.role,
    };
    // Sliding refresh — rewrite the same cookie value with a fresh Max-Age.
    reply.setCookie(SESSION_COOKIE, session.id, sessionCookieOptions(request));
  });
}

export interface SessionCookieOptions {
  path: string;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  maxAge: number;
  signed: boolean;
}

export function sessionCookieOptions(request: FastifyRequest): SessionCookieOptions {
  // Secure only when the connection is HTTPS — otherwise the browser drops it
  // and the dev server (http) can't carry sessions at all.
  const isHttps = (request.headers['x-forwarded-proto'] as string | undefined) === 'https'
    || request.protocol === 'https';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    signed: true,
  };
}

export function userToPublic(u: UserRow): AuthenticatedUser {
  return { id: u.id, username: u.username, displayName: u.displayName, role: u.role };
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
  }
}
