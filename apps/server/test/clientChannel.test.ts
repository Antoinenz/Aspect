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
import { listen } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Collect the first `count` parsed messages from a ws connection. */
function collect(url: string, count: number): Promise<ServerToClientMessage[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
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
    app = await buildApp({ cache });
    const base = await listen(app);
    const [first, second] = await collect(`${base}/ws`, 2);
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
    app = await buildApp({ cache });
    const base = await listen(app);
    const socket = new WebSocket(`${base}/ws`);
    const msgs: ServerToClientMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      socket.on('message', (data) => {
        msgs.push(JSON.parse(data.toString()) as ServerToClientMessage);
        // After the initial status + snapshot, push an entity update.
        if (msgs.length === 2) {
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
        if (msgs.length === 3) resolve();
      });
      socket.on('error', reject);
    });
    socket.close();

    expect(msgs[2]?.type).toBe('entity_update');
    if (msgs[2]?.type === 'entity_update') {
      expect(msgs[2].entities[0]?.entityId).toBe('light.kitchen');
    }
  });
});

describe('ClientHub.handleClientMessage', () => {
  it('invokes the service caller for a call_service message', () => {
    const cache = new HaCache();
    const hub = new ClientHub(cache);
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
    const hub = new ClientHub(new HaCache());
    hub.setServiceCaller(() => {
      throw new Error('should not be called');
    });
    expect(() => hub.handleClientMessage('not json')).not.toThrow();
    expect(() => hub.handleClientMessage(JSON.stringify({ type: 'x' }))).not.toThrow();
  });
});
