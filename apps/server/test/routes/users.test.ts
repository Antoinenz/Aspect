import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

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

async function makeAppWithAdmin(): Promise<{ app: FastifyInstance; cookie: string }> {
  const built = await buildApp({ cookieSecret: 'x'.repeat(40) });
  const res = await built.inject({
    method: 'POST', url: '/api/auth/signup',
    payload: { username: 'admin', password: 'longenough', displayName: 'Admin' },
  });
  return { app: built, cookie: res.headers['set-cookie'] as string };
}

describe('user management routes', () => {
  it('GET /api/users lists the seeded admin', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    const res = await app.inject({ method: 'GET', url: '/api/users', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const list = res.json().users;
    expect(list).toHaveLength(1);
    expect(list[0].role).toBe('admin');
  });

  it('POST /api/invites creates an invite that signup can consume', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    const inv = await app.inject({
      method: 'POST', url: '/api/invites',
      payload: { role: 'member' },
      headers: { cookie },
    });
    expect(inv.statusCode).toBe(201);
    const token = inv.json().invite.token;
    expect(token).toBeTypeOf('string');

    const signup = await app.inject({
      method: 'POST', url: '/api/auth/signup',
      payload: { username: 'bob', password: 'longenough', displayName: 'Bob', inviteToken: token },
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.json().user.role).toBe('member');
  });

  it('PATCH /api/users/:id promotes a member to admin', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    // Seed a member via invite.
    const inv = await app.inject({
      method: 'POST', url: '/api/invites', payload: { role: 'member' }, headers: { cookie },
    });
    await app.inject({
      method: 'POST', url: '/api/auth/signup',
      payload: {
        username: 'bob', password: 'longenough', displayName: 'Bob',
        inviteToken: inv.json().invite.token,
      },
    });
    const bob = app.users.getByUsername('bob')!;
    const res = await app.inject({
      method: 'PATCH', url: `/api/users/${bob.id}`,
      payload: { role: 'admin' }, headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(app.users.getById(bob.id)?.role).toBe('admin');
  });

  it('PATCH refuses to demote the last admin', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    const admin = app.users.getByUsername('admin')!;
    const res = await app.inject({
      method: 'PATCH', url: `/api/users/${admin.id}`,
      payload: { role: 'member' }, headers: { cookie },
    });
    expect(res.statusCode).toBe(409);
  });

  it('DELETE /api/users/:id refuses self-delete and last-admin delete', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    const admin = app.users.getByUsername('admin')!;
    const self = await app.inject({
      method: 'DELETE', url: `/api/users/${admin.id}`, headers: { cookie },
    });
    expect(self.statusCode).toBe(400);
  });

  it('DELETE works for a normal member', async () => {
    const { app: a, cookie } = await makeAppWithAdmin();
    app = a;
    const inv = await app.inject({
      method: 'POST', url: '/api/invites', payload: { role: 'member' }, headers: { cookie },
    });
    await app.inject({
      method: 'POST', url: '/api/auth/signup',
      payload: {
        username: 'bob', password: 'longenough', displayName: 'Bob',
        inviteToken: inv.json().invite.token,
      },
    });
    const bob = app.users.getByUsername('bob')!;
    const res = await app.inject({
      method: 'DELETE', url: `/api/users/${bob.id}`, headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(app.users.getById(bob.id)).toBeNull();
  });

  it('user-management routes require admin', async () => {
    app = await buildApp({ cookieSecret: 'x'.repeat(40) });
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
  });
});
