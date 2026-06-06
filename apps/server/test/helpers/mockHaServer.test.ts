import { describe, it, expect, afterEach } from 'vitest';
import {
  createConnection,
  createLongLivedTokenAuth,
  getStates,
  type Connection,
} from 'home-assistant-js-websocket';
import { MockHaServer } from './mockHaServer.js';

let mock: MockHaServer | undefined;
let conn: Connection | undefined;

afterEach(async () => {
  conn?.close();
  conn = undefined;
  await mock?.stop();
  mock = undefined;
});

describe('MockHaServer', () => {
  it('lets home-assistant-js-websocket authenticate and fetch states', async () => {
    mock = await MockHaServer.start({
      token: 'secret',
      states: [
        {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: {},
          last_changed: 't',
          last_updated: 't',
        },
      ],
    });
    const auth = createLongLivedTokenAuth(mock.url, 'secret');
    conn = await createConnection({ auth });
    const states = await getStates(conn);
    expect(states).toHaveLength(1);
    expect(states[0]?.entity_id).toBe('light.kitchen');
  });
});
