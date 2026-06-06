import { describe, it, expect, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { createCallServiceMessage } from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { HaCache } from '../src/cache/haCache.js';
import { startHaConnection, type HaConnectionHandle } from '../src/ha/connection.js';
import { MockHaServer } from './helpers/mockHaServer.js';
import { listen } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;
let mock: MockHaServer | undefined;
let handle: HaConnectionHandle | undefined;

afterEach(async () => {
  handle?.stop();
  handle = undefined;
  await mock?.stop();
  mock = undefined;
  await app?.close();
  app = undefined;
});

describe('control flow', () => {
  it('forwards a client call_service all the way to Home Assistant', async () => {
    mock = await MockHaServer.start({ token: 'secret', states: [] });
    const cache = new HaCache();
    app = await buildApp({ cache });
    const base = await listen(app);
    handle = await startHaConnection({ url: mock.url, token: 'secret', cache, hub: app.clientHub });
    app.clientHub.setServiceCaller(handle.callService);

    const socket = new WebSocket(`${base}/ws`);
    await new Promise<void>((resolve) => socket.on('open', resolve));
    socket.send(JSON.stringify(createCallServiceMessage('light', 'turn_on', 'light.k', { brightness_pct: 60 })));

    await vi.waitFor(() => {
      const calls = mock!.getServiceCalls();
      expect(calls.length).toBe(1);
      expect(calls[0]?.domain).toBe('light');
      expect(calls[0]?.service).toBe('turn_on');
      expect(calls[0]?.target).toEqual({ entity_id: 'light.k' });
      expect(calls[0]?.serviceData).toEqual({ brightness_pct: 60 });
    });
    socket.close();
  });
});
