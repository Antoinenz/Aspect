import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { HaSupervisor } from '../../src/ha/haSupervisor.js';
import { ServerSettingsStore } from '../../src/db/serverSettingsStore.js';

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
  const settings = new ServerSettingsStore(':memory:');
  const sup = new HaSupervisor(
    { url: null, token: null }, settings, {} as never,
    { setStatus: () => {}, setServiceCaller: () => {} } as never,
  );
  vi.spyOn(sup, 'start').mockResolvedValue();
  vi.spyOn(sup, 'reconnect').mockResolvedValue();
  vi.spyOn(sup, 'stop').mockResolvedValue();
  return buildApp({
    serverSettings: settings, haSupervisor: sup,
    cookieSecret: 'x'.repeat(40),
  });
}

async function signupAs(app: FastifyInstance, username: string, password: string, isFirst: boolean, inviteRole?: 'admin' | 'member'): Promise<string> {
  let inviteToken: string | undefined;
  if (!isFirst && inviteRole) {
    const invite = app.invites.create({ role: inviteRole, createdBy: 'seed' });
    inviteToken = invite.token;
  }
  const res = await app.inject({
    method: 'POST', url: '/api/auth/signup',
    payload: { username, password, displayName: username, inviteToken },
  });
  return res.headers['set-cookie'] as string;
}

describe('admin endpoint guards', () => {
  it('anonymous request → 401', async () => {
    app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/admin/settings' });
    expect(res.statusCode).toBe(401);
  });

  it('member role → 403', async () => {
    app = await makeApp();
    await signupAs(app, 'alice', 'longenough', true); // bootstrap admin
    const memberCookie = await signupAs(app, 'bob', 'longenough', false, 'member');
    const res = await app.inject({
      method: 'GET', url: '/api/admin/settings',
      headers: { cookie: memberCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin role → 200', async () => {
    app = await makeApp();
    const adminCookie = await signupAs(app, 'alice', 'longenough', true);
    const res = await app.inject({
      method: 'GET', url: '/api/admin/settings',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});
