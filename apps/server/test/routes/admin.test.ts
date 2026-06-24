import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { ServerSettingsStore } from '../../src/db/serverSettingsStore.js';
import { HaSupervisor } from '../../src/ha/haSupervisor.js';

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

/**
 * Build the app with a real ServerSettingsStore but stub the supervisor's
 * connect/reconnect so tests never reach out to a real Home Assistant.
 */
async function makeApp(opts: {
  envUrl?: string | null;
  envToken?: string | null;
} = {}): Promise<FastifyInstance> {
  const settings = new ServerSettingsStore(':memory:');
  const envHa = { url: opts.envUrl ?? null, token: opts.envToken ?? null };
  // We construct the supervisor with the real store but override its async
  // methods so the admin endpoints exercise the route + status surface
  // without a live HA socket.
  const supervisor = new HaSupervisor(
    envHa,
    settings,
    // Cache and hub are constructed inside buildApp before the supervisor
    // would normally be created; here we hand it placeholders since our
    // stubbed methods never read them.
    {} as never,
    { setStatus: () => {}, setServiceCaller: () => {} } as never,
  );
  vi.spyOn(supervisor, 'start').mockResolvedValue();
  vi.spyOn(supervisor, 'reconnect').mockResolvedValue();
  vi.spyOn(supervisor, 'stop').mockResolvedValue();
  vi.spyOn(supervisor, 'test').mockResolvedValue();
  return buildApp({ serverSettings: settings, envHa, haSupervisor: supervisor });
}

describe('admin routes', () => {
  it('GET /api/admin/settings reports env source when env vars set and no override', async () => {
    app = await makeApp({ envUrl: 'http://env-ha:8123', envToken: 'env-tok' });
    const res = await app.inject({ method: 'GET', url: '/api/admin/settings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.effective.url).toBe('http://env-ha:8123');
    expect(body.effective.hasToken).toBe(true);
    expect(body.effective.source).toBe('env');
    expect(body.envHasUrl).toBe(true);
    expect(body.envHasToken).toBe(true);
    // CRITICAL: the response must never include the token itself.
    expect(JSON.stringify(body)).not.toContain('env-tok');
  });

  it('GET reports "none" when nothing is configured', async () => {
    app = await makeApp();
    const body = (await app.inject({ method: 'GET', url: '/api/admin/settings' })).json();
    expect(body.effective.source).toBe('none');
    expect(body.effective.hasToken).toBe(false);
  });

  it('PUT validates haUrl as a required http(s) URL', async () => {
    app = await makeApp();
    const missing = await app.inject({ method: 'PUT', url: '/api/admin/settings', payload: {} });
    expect(missing.statusCode).toBe(400);
    const bad = await app.inject({ method: 'PUT', url: '/api/admin/settings', payload: { haUrl: 'ftp://x' } });
    expect(bad.statusCode).toBe(400);
  });

  it('PUT stores URL+token, marks source=db, and triggers reconnect', async () => {
    app = await makeApp({ envUrl: 'http://env-ha:8123', envToken: 'env-tok' });
    const reconnect = vi.spyOn(app.haSupervisor, 'reconnect');
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      payload: { haUrl: 'http://override:8123', haToken: 'override-tok' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.effective.source).toBe('db');
    expect(body.effective.url).toBe('http://override:8123');
    expect(body.effective.hasToken).toBe(true);
    expect(reconnect).toHaveBeenCalledOnce();
    // GET should reflect the saved override.
    const after = (await app.inject({ method: 'GET', url: '/api/admin/settings' })).json();
    expect(after.effective.url).toBe('http://override:8123');
  });

  it('PUT without haToken keeps the previously stored token', async () => {
    app = await makeApp();
    await app.inject({
      method: 'PUT', url: '/api/admin/settings',
      payload: { haUrl: 'http://a:8123', haToken: 'first-tok' },
    });
    const res = await app.inject({
      method: 'PUT', url: '/api/admin/settings',
      payload: { haUrl: 'http://b:8123' },
    });
    expect(res.json().effective.hasToken).toBe(true);
  });

  it('DELETE clears the override and reverts to env', async () => {
    app = await makeApp({ envUrl: 'http://env-ha:8123', envToken: 'env-tok' });
    await app.inject({
      method: 'PUT', url: '/api/admin/settings',
      payload: { haUrl: 'http://override:8123', haToken: 'override-tok' },
    });
    const res = await app.inject({ method: 'DELETE', url: '/api/admin/settings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.effective.source).toBe('env');
    expect(body.effective.url).toBe('http://env-ha:8123');
  });

  it('POST /api/admin/test-connection validates inputs', async () => {
    app = await makeApp();
    const empty = await app.inject({
      method: 'POST', url: '/api/admin/test-connection', payload: {},
    });
    expect(empty.statusCode).toBe(400);
    const badUrl = await app.inject({
      method: 'POST', url: '/api/admin/test-connection',
      payload: { haUrl: 'not-a-url', haToken: 't' },
    });
    expect(badUrl.statusCode).toBe(400);
  });

  it('POST test-connection returns {ok:true} when supervisor.test succeeds', async () => {
    app = await makeApp();
    const res = await app.inject({
      method: 'POST', url: '/api/admin/test-connection',
      payload: { haUrl: 'http://a:8123', haToken: 't' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('POST test-connection returns {ok:false, error} when supervisor.test throws', async () => {
    app = await makeApp();
    vi.spyOn(app.haSupervisor, 'test').mockRejectedValue(new Error('Auth failed'));
    const res = await app.inject({
      method: 'POST', url: '/api/admin/test-connection',
      payload: { haUrl: 'http://a:8123', haToken: 't' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: false, error: 'Auth failed' });
  });
});
