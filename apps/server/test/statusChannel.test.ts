import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { isServerToClientMessage, type StatusMessage } from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { listen, firstMessage } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /ws', () => {
  it('sends a status message immediately on connect', async () => {
    app = await buildApp();
    const base = await listen(app);
    const msg = await firstMessage(`${base}/ws`);
    expect(isServerToClientMessage(msg)).toBe(true);
    expect((msg as { type: string }).type).toBe('status');
  });

  it('greets a late-joining client with the current status', async () => {
    app = await buildApp();
    app.statusHub.setStatus('degraded', true);
    const base = await listen(app);
    const msg = (await firstMessage(`${base}/ws`)) as StatusMessage;
    expect(msg.status).toBe('degraded');
    expect(msg.haConnected).toBe(true);
  });

  it('broadcasts status changes to an already-connected client', async () => {
    app = await buildApp();
    const base = await listen(app);
    const socket = new WebSocket(`${base}/ws`);
    const received: StatusMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      socket.on('message', (data) => {
        received.push(JSON.parse(data.toString()) as StatusMessage);
        // First message is the on-connect greeting; trigger a broadcast,
        // then resolve once the broadcast arrives as the second message.
        if (received.length === 1) app!.statusHub.setStatus('degraded', true);
        if (received.length === 2) resolve();
      });
      socket.on('error', reject);
    });
    socket.close();

    expect(received[0]?.status).toBe('online');
    expect(received[1]?.status).toBe('degraded');
    expect(received[1]?.haConnected).toBe(true);
  });
});
