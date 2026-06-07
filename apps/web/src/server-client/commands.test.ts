import { describe, it, expect, vi, beforeEach } from 'vitest';

const sent: unknown[] = [];
vi.mock('./socket.js', () => ({
  sendToServer: (msg: unknown) => {
    sent.push(msg);
    return true;
  },
}));

import { callService, setFavorite } from './commands.js';

describe('callService', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('sends a call_service message with data', () => {
    callService('light', 'turn_on', 'light.k', { brightness_pct: 50 });
    expect(sent[0]).toEqual({
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      entityId: 'light.k',
      data: { brightness_pct: 50 },
    });
  });
});

describe('setFavorite', () => {
  beforeEach(() => {
    sent.length = 0;
  });
  it('sends a set_favorite message', () => {
    setFavorite('light.a', true);
    expect(sent[0]).toEqual({ type: 'set_favorite', entityId: 'light.a', favorite: true });
  });
});
