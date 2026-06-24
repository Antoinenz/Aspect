import { describe, it, expect, beforeEach } from 'vitest';
import { HaSupervisor } from '../../src/ha/haSupervisor.js';
import { ServerSettingsStore } from '../../src/db/serverSettingsStore.js';

const stubHub = { setStatus: () => {}, setServiceCaller: () => {} } as never;

describe('HaSupervisor.effective', () => {
  let store: ServerSettingsStore;
  beforeEach(() => {
    store = new ServerSettingsStore(':memory:');
  });

  it('reports "none" when neither env nor store have values', () => {
    const sup = new HaSupervisor({ url: null, token: null }, store, {} as never, stubHub);
    const eff = sup.effective();
    expect(eff.source).toBe('none');
    expect(eff.url).toBeNull();
    expect(eff.token).toBeNull();
  });

  it('reports "env" when only env vars are set', () => {
    const sup = new HaSupervisor({ url: 'http://env:8123', token: 'envtok' }, store, {} as never, stubHub);
    expect(sup.effective()).toEqual({ url: 'http://env:8123', token: 'envtok', source: 'env' });
  });

  it('reports "db" when both env and store are set (store wins)', () => {
    store.patch({ haUrl: 'http://db:8123', haToken: 'dbtok' });
    const sup = new HaSupervisor({ url: 'http://env:8123', token: 'envtok' }, store, {} as never, stubHub);
    expect(sup.effective()).toEqual({ url: 'http://db:8123', token: 'dbtok', source: 'db' });
  });

  it('falls back to env when store has only a URL (incomplete override)', () => {
    store.patch({ haUrl: 'http://db:8123' });
    const sup = new HaSupervisor({ url: 'http://env:8123', token: 'envtok' }, store, {} as never, stubHub);
    // The stored URL alone is not a valid override — fall back to the full env config.
    expect(sup.effective().source).toBe('env');
  });
});

describe('HaSupervisor.status', () => {
  it('never exposes the token, even when configured', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://db:8123', haToken: 'super-secret' });
    const sup = new HaSupervisor({ url: 'http://env:8123', token: 'env-secret' }, store, {} as never, stubHub);
    const s = sup.status();
    expect(JSON.stringify(s)).not.toContain('super-secret');
    expect(JSON.stringify(s)).not.toContain('env-secret');
    expect(s.effective.hasToken).toBe(true);
  });

  it('envHasToken reflects only the env, not the store', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://db:8123', haToken: 'dbtok' });
    const sup = new HaSupervisor({ url: null, token: null }, store, {} as never, stubHub);
    const s = sup.status();
    expect(s.envHasUrl).toBe(false);
    expect(s.envHasToken).toBe(false);
    expect(s.effective.source).toBe('db');
  });
});
