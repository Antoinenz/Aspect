import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { UsersStore } from '../../src/db/usersStore.js';
import { SessionsStore } from '../../src/db/sessionsStore.js';
import { InvitesStore } from '../../src/db/invitesStore.js';

let app: FastifyInstance | undefined;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.restoreAllMocks();
});

async function makeApp(): Promise<FastifyInstance> {
  return buildApp({
    users: new UsersStore(':memory:'),
    sessions: new SessionsStore(':memory:'),
    invites: new InvitesStore(':memory:'),
    cookieSecret: 'x'.repeat(40),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCookie(res: { headers: any }, name: string): string | null {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const all: string[] = Array.isArray(setCookie) ? setCookie : [setCookie];
  const found = all.find((c: string) => c.startsWith(`${name}=`));
  return found ? found.split(';')[0]!.slice(name.length + 1) : null;
}

describe('auth routes', () => {
  describe('GET /api/auth/state', () => {
    it('reports hasUsers=false when empty, true after a signup', async () => {
      app = await makeApp();
      let r = await app.inject({ method: 'GET', url: '/api/auth/state' });
      expect(r.json()).toEqual({ hasUsers: false });
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      r = await app.inject({ method: 'GET', url: '/api/auth/state' });
      expect(r.json()).toEqual({ hasUsers: true });
    });
  });

  describe('POST /api/auth/signup', () => {
    it('first signup is auto-promoted to admin and gets a session cookie', async () => {
      app = await makeApp();
      const res = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user.role).toBe('admin');
      expect(getCookie(res, 'aspect_session')).toBeTruthy();
    });

    it('second signup without an invite is forbidden', async () => {
      app = await makeApp();
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const res = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'bob', password: 'longenough', displayName: 'Bob' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('second signup with a valid invite consumes it and gets the invite role', async () => {
      app = await makeApp();
      // Bootstrap admin.
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      // Create an invite directly via the store (admin route comes later).
      const invite = app.invites.create({ role: 'member', createdBy: 'seed' });
      const res = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: {
          username: 'bob', password: 'longenough', displayName: 'Bob',
          inviteToken: invite.token,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user.role).toBe('member');
      // Invite must now be consumed.
      const after = app.invites.get(invite.token);
      expect(after?.usedBy).toBe(res.json().user.id);
    });

    it('rejects an already-used invite', async () => {
      app = await makeApp();
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const invite = app.invites.create({ role: 'member', createdBy: 'seed' });
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'bob', password: 'longenough', displayName: 'Bob', inviteToken: invite.token },
      });
      const res = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'carol', password: 'longenough', displayName: 'Carol', inviteToken: invite.token },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects a short password', async () => {
      app = await makeApp();
      const res = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'short', displayName: 'Alice' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs the user in with valid credentials', async () => {
      app = await makeApp();
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const res = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { username: 'alice', password: 'longenough' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.username).toBe('alice');
      expect(getCookie(res, 'aspect_session')).toBeTruthy();
    });

    it('rejects wrong password with 401', async () => {
      app = await makeApp();
      await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const res = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { username: 'alice', password: 'wrongpass' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects unknown user with 401 (no info leak)', async () => {
      app = await makeApp();
      const res = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { username: 'noone', password: 'whatever' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns null when not logged in', async () => {
      app = await makeApp();
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.json()).toEqual({ user: null });
    });

    it('returns the user when the session cookie is valid', async () => {
      app = await makeApp();
      const signup = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const cookie = signup.headers['set-cookie'] as string;
      const me = await app.inject({
        method: 'GET', url: '/api/auth/me',
        headers: { cookie },
      });
      expect(me.json().user.username).toBe('alice');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the cookie and invalidates the session', async () => {
      app = await makeApp();
      const signup = await app.inject({
        method: 'POST', url: '/api/auth/signup',
        payload: { username: 'alice', password: 'longenough', displayName: 'Alice' },
      });
      const cookie = signup.headers['set-cookie'] as string;
      const out = await app.inject({
        method: 'POST', url: '/api/auth/logout', headers: { cookie },
      });
      expect(out.statusCode).toBe(200);
      // After logout, /me should report null again.
      const me = await app.inject({
        method: 'GET', url: '/api/auth/me', headers: { cookie },
      });
      expect(me.json().user).toBeNull();
    });
  });
});
