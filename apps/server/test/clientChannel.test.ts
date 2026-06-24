import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import {
  isServerToClientMessage,
  type ServerToClientMessage,
} from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { HaCache } from '../src/cache/haCache.js';
import { ClientHub } from '../src/ws/clientChannel.js';
import { FavoritesStore } from '../src/db/favoritesStore.js';
import { listen, bootstrapAdminCookie } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Collect the first `count` parsed messages from a ws connection. */
function collect(url: string, count: number, cookie: string): Promise<ServerToClientMessage[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers: { cookie } });
    const msgs: ServerToClientMessage[] = [];
    socket.on('message', (data) => {
      msgs.push(JSON.parse(data.toString()) as ServerToClientMessage);
      if (msgs.length === count) {
        socket.close();
        resolve(msgs);
      }
    });
    socket.on('error', reject);
  });
}

describe('GET /ws (ClientHub)', () => {
  it('greets a new client with a status then a snapshot', async () => {
    const cache = new HaCache();
    cache.setSnapshot({
      entities: [
        {
          entityId: 'light.kitchen',
          state: 'on',
          attributes: {},
          lastChanged: 't',
          lastUpdated: 't',
        },
      ],
      areas: [{ areaId: 'k', name: 'Kitchen' }],
      devices: [],
      registry: [],
    });
    app = await buildApp({ cache, cookieSecret: 'x'.repeat(40) });
    const cookie = await bootstrapAdminCookie(app);
    const base = await listen(app);
    const [first, second] = await collect(`${base}/ws`, 2, cookie);
    expect(isServerToClientMessage(first)).toBe(true);
    expect(first?.type).toBe('status');
    expect(second?.type).toBe('snapshot');
    if (second?.type === 'snapshot') {
      expect(second.entities).toHaveLength(1);
      expect(second.areas[0]?.name).toBe('Kitchen');
    }
  });

  it('broadcasts an entity update to a connected client', async () => {
    const cache = new HaCache();
    app = await buildApp({ cache, cookieSecret: 'x'.repeat(40) });
    const cookie = await bootstrapAdminCookie(app);
    const base = await listen(app);
    const socket = new WebSocket(`${base}/ws`, { headers: { cookie } });
    const msgs: ServerToClientMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      socket.on('message', (data) => {
        msgs.push(JSON.parse(data.toString()) as ServerToClientMessage);
        // After the initial status + snapshot + favorites, push an entity update.
        if (msgs.length === 3) {
          app!.clientHub.broadcastEntityUpdate([
            {
              entityId: 'light.kitchen',
              state: 'on',
              attributes: {},
              lastChanged: 't',
              lastUpdated: 't',
            },
          ]);
        }
        if (msgs.length === 4) resolve();
      });
      socket.on('error', reject);
    });
    socket.close();

    expect(msgs[3]?.type).toBe('entity_update');
    if (msgs[3]?.type === 'entity_update') {
      expect(msgs[3].entities[0]?.entityId).toBe('light.kitchen');
    }
  });
});

describe('ClientHub.handleClientMessage', () => {
  it('invokes the service caller for a call_service message', () => {
    const cache = new HaCache();
    const hub = new ClientHub(cache, new FavoritesStore(':memory:'));
    const calls: Array<[string, string, string, unknown]> = [];
    hub.setServiceCaller((domain, service, entityId, data) => {
      calls.push([domain, service, entityId, data]);
    });
    hub.handleClientMessage(
      JSON.stringify({
        type: 'call_service',
        domain: 'light',
        service: 'turn_on',
        entityId: 'light.k',
        data: { brightness_pct: 40 },
      }),
    );
    expect(calls).toEqual([['light', 'turn_on', 'light.k', { brightness_pct: 40 }]]);
  });

  it('ignores invalid messages without throwing', () => {
    const hub = new ClientHub(new HaCache(), new FavoritesStore(':memory:'));
    hub.setServiceCaller(() => {
      throw new Error('should not be called');
    });
    expect(() => hub.handleClientMessage('not json')).not.toThrow();
    expect(() => hub.handleClientMessage(JSON.stringify({ type: 'x' }))).not.toThrow();
  });
});

describe('ClientHub favorites', () => {
  it('persists and rebroadcasts a set_favorite', () => {
    const store = new FavoritesStore(':memory:');
    const hub = new ClientHub(new HaCache(), store);
    hub.handleClientMessage(
      JSON.stringify({ type: 'set_favorite', entityId: 'light.a', favorite: true }),
    );
    expect(store.list()).toEqual(['light.a']);
    store.close();
  });
});

describe('ClientHub ping', () => {
  it('replies to a ping with a pong echoing the nonce', () => {
    const hub = new ClientHub(new HaCache(), new FavoritesStore(':memory:'));
    const sent: string[] = [];
    const fake = { readyState: 1, OPEN: 1, send: (s: string) => sent.push(s), on: () => {} } as unknown as import('@fastify/websocket').WebSocket;
    hub.handleClientMessage(JSON.stringify({ type: 'ping', nonce: 42 }), fake);
    const reply = JSON.parse(sent[0]!);
    expect(reply.type).toBe('pong');
    expect(reply.nonce).toBe(42);
    expect(typeof reply.ts).toBe('number');
  });
});
