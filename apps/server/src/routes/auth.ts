import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import {
  SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions, userToPublic,
} from '../auth/session.js';

interface SignupBody {
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
  inviteToken?: unknown;
}

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function validateCredentials(username: string, password: string): string | null {
  if (username.length < 2 || username.length > 32) return 'Username must be 2–32 characters.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return 'Username may only contain letters, digits, dots, dashes, underscores.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  return null;
}

/**
 * Authentication endpoints — signup, login, logout, me.
 *
 * First-user bootstrap: when the users table is empty, the first POST to
 * /signup is allowed without an invite and is promoted to admin. After
 * that, signups require an invite token (consumed atomically by the store).
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/me', async (request) => {
    return { user: request.user ?? null };
  });

  app.post('/api/auth/signup', async (request, reply) => {
    const body = (request.body ?? {}) as SignupBody;
    const username = asTrimmedString(body.username);
    const password = asTrimmedString(body.password);
    const displayName = asTrimmedString(body.displayName) ?? username;
    const inviteToken = asTrimmedString(body.inviteToken);

    if (!username || !password || !displayName) {
      return reply.code(400).send({ error: 'username, password, and displayName are required' });
    }
    const validationError = validateCredentials(username, password);
    if (validationError) return reply.code(400).send({ error: validationError });

    if (app.users.getByUsername(username)) {
      return reply.code(409).send({ error: 'Username is taken.' });
    }

    let role: 'admin' | 'member' = 'member';
    const isFirstUser = app.users.count() === 0;

    if (isFirstUser) {
      role = 'admin';
    } else {
      if (!inviteToken) {
        return reply.code(403).send({ error: 'Signup requires an invitation.' });
      }
      const invite = app.invites.get(inviteToken);
      if (!invite || invite.usedAt || new Date(invite.expiresAt).getTime() < Date.now()) {
        return reply.code(403).send({ error: 'Invitation is invalid or expired.' });
      }
      role = invite.role;
    }

    const passwordHash = await bcrypt.hash(password, 11);
    const user = app.users.create({ username, displayName, passwordHash, role });

    if (!isFirstUser && inviteToken) {
      const consumed = app.invites.consume(inviteToken, user.id);
      if (!consumed) {
        // Lost the race with another consumer — roll the new user back.
        app.users.delete(user.id);
        return reply.code(403).send({ error: 'Invitation was just used by someone else.' });
      }
    }

    const session = app.sessions.create(user.id, SESSION_TTL_MS);
    reply.setCookie(SESSION_COOKIE, session.id, sessionCookieOptions(request));
    return reply.code(201).send({ user: userToPublic(user) });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = (request.body ?? {}) as LoginBody;
    const username = asTrimmedString(body.username);
    const password = asTrimmedString(body.password);
    if (!username || !password) {
      return reply.code(400).send({ error: 'username and password are required' });
    }
    const found = app.users.getByUsername(username);
    // Always run bcrypt.compare even when the user is missing, so timing
    // doesn't leak whether the username exists.
    const dummyHash = '$2a$11$invalidinvalidinvalidinvaliduyXfQ8HoJ.SS5GfFhqGyfqK8wJtl1Ku';
    const ok = await bcrypt.compare(password, found?.passwordHash ?? dummyHash);
    if (!found || !ok) {
      return reply.code(401).send({ error: 'Invalid username or password.' });
    }
    const session = app.sessions.create(found.id, SESSION_TTL_MS);
    reply.setCookie(SESSION_COOKIE, session.id, sessionCookieOptions(request));
    return { user: userToPublic(found) };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const raw = request.cookies?.[SESSION_COOKIE];
    if (raw) {
      const unsigned = app.unsignCookie(raw);
      if (unsigned.valid && unsigned.value) app.sessions.delete(unsigned.value);
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  /** Whether anyone has signed up — drives the SPA's bootstrap flow. */
  app.get('/api/auth/state', async () => {
    return { hasUsers: app.users.count() > 0 };
  });
}
