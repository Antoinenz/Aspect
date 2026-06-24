import { describe, it, expect } from 'vitest';
import { ServerSettingsStore } from '../../src/db/serverSettingsStore.js';

describe('ServerSettingsStore', () => {
  it('returns empty values before anything is written', () => {
    const store = new ServerSettingsStore(':memory:');
    expect(store.get()).toEqual({ haUrl: null, haToken: null, updatedAt: null });
    store.close();
  });

  it('round-trips a URL and token', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://ha.local:8123', haToken: 'tok' });
    const s = store.get();
    expect(s.haUrl).toBe('http://ha.local:8123');
    expect(s.haToken).toBe('tok');
    expect(s.updatedAt).toBeTypeOf('string');
    store.close();
  });

  it('omitting haToken in a patch leaves the existing token alone', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://a', haToken: 'tok' });
    store.patch({ haUrl: 'http://b' }); // no token field
    expect(store.get()).toMatchObject({ haUrl: 'http://b', haToken: 'tok' });
    store.close();
  });

  it('explicit null haToken clears the token', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://a', haToken: 'tok' });
    store.patch({ haToken: null });
    expect(store.get()).toMatchObject({ haUrl: 'http://a', haToken: null });
    store.close();
  });

  it('clear() removes the row', () => {
    const store = new ServerSettingsStore(':memory:');
    store.patch({ haUrl: 'http://a', haToken: 'tok' });
    store.clear();
    expect(store.get()).toEqual({ haUrl: null, haToken: null, updatedAt: null });
    store.close();
  });
});
