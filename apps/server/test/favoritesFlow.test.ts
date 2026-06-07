import { describe, it, expect, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import {
  createSetFavoriteMessage,
  type ServerToClientMessage,
} from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { HaCache } from '../src/cache/haCache.js';
import { FavoritesStore } from '../src/db/favoritesStore.js';
import { listen } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('favorites flow', () => {
  it('persists a pin from a client and rebroadcasts the favorites list', async () => {
    const favorites = new FavoritesStore(':memory:');
    app = await buildApp({ cache: new HaCache(), favorites });
    const base = await listen(app);

    const received: ServerToClientMessage[] = [];
    const socket = new WebSocket(`${base}/ws`);
    socket.on('message', (d) =>
      received.push(JSON.parse(d.toString()) as ServerToClientMessage),
    );
    await new Promise<void>((resolve) => socket.on('open', resolve));

    // Initial favorites snapshot is empty.
    await vi.waitFor(() => {
      const fav = received.find((m) => m.type === 'favorites');
      expect(fav?.type).toBe('favorites');
      if (fav?.type === 'favorites') expect(fav.entityIds).toEqual([]);
    });

    socket.send(JSON.stringify(createSetFavoriteMessage('light.kitchen', true)));

    await vi.waitFor(() => {
      const fav = [...received].reverse().find((m) => m.type === 'favorites');
      if (fav?.type === 'favorites') {
        expect(fav.entityIds).toEqual(['light.kitchen']);
      } else {
        throw new Error('no favorites update yet');
      }
    });
    expect(favorites.list()).toEqual(['light.kitchen']);
    socket.close();
  });
});
