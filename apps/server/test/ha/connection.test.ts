import { describe, it, expect, afterEach, vi } from 'vitest';
import { MockHaServer } from '../helpers/mockHaServer.js';
import { HaCache } from '../../src/cache/haCache.js';
import { ClientHub } from '../../src/ws/clientChannel.js';
import { FavoritesStore } from '../../src/db/favoritesStore.js';
import { startHaConnection, type HaConnectionHandle } from '../../src/ha/connection.js';

let mock: MockHaServer | undefined;
let handle: HaConnectionHandle | undefined;

afterEach(async () => {
  handle?.stop();
  handle = undefined;
  await mock?.stop();
  mock = undefined;
});

describe('startHaConnection', () => {
  it('loads states + registries into the cache and goes online', async () => {
    mock = await MockHaServer.start({
      token: 'secret',
      states: [
        {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { brightness: 200 },
          last_changed: 't',
          last_updated: 't',
        },
      ],
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      devices: [{ id: 'd1', name: 'Bulb', name_by_user: null, area_id: 'kitchen' }],
      entityRegistry: [
        {
          entity_id: 'light.kitchen',
          device_id: 'd1',
          area_id: null,
          name: null,
          original_name: 'Kitchen Light',
          platform: 'demo',
        },
      ],
    });
    const cache = new HaCache();
    const hub = new ClientHub(cache, new FavoritesStore(':memory:'));
    handle = await startHaConnection({
      url: mock.url,
      token: 'secret',
      cache,
      hub,
    });

    const snap = cache.getSnapshot();
    expect(snap.entities.map((e) => e.entityId)).toEqual(['light.kitchen']);
    expect(snap.areas[0]?.name).toBe('Kitchen');
    expect(snap.registry[0]?.name).toBe('Kitchen Light');
  });

  it('applies a live state_changed event to the cache', async () => {
    mock = await MockHaServer.start({ token: 'secret', states: [] });
    const cache = new HaCache();
    const hub = new ClientHub(cache, new FavoritesStore(':memory:'));
    handle = await startHaConnection({ url: mock.url, token: 'secret', cache, hub });

    mock.emitStateChanged('switch.fan', {
      entity_id: 'switch.fan',
      state: 'on',
      attributes: {},
      last_changed: 't',
      last_updated: 't',
    });

    // Allow the event to round-trip.
    await vi.waitFor(() => {
      expect(cache.getSnapshot().entities.map((e) => e.entityId)).toContain(
        'switch.fan',
      );
    });
  });
});
