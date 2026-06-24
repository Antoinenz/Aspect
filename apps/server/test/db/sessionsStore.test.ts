import { describe, it, expect } from 'vitest';
import { SessionsStore } from '../../src/db/sessionsStore.js';

describe('SessionsStore', () => {
  it('creates and reads a session', () => {
    const s = new SessionsStore(':memory:');
    const sess = s.create('user-1', 60_000);
    expect(s.get(sess.id)?.userId).toBe('user-1');
    s.close();
  });

  it('deleteExpired removes only past sessions', () => {
    const s = new SessionsStore(':memory:');
    const stillValid = s.create('u1', 60_000);
    const alreadyExpired = s.create('u2', -1_000);
    s.deleteExpired();
    expect(s.get(stillValid.id)).not.toBeNull();
    expect(s.get(alreadyExpired.id)).toBeNull();
    s.close();
  });

  it('deleteByUser revokes all sessions for one user', () => {
    const s = new SessionsStore(':memory:');
    const a1 = s.create('u1', 60_000);
    const a2 = s.create('u1', 60_000);
    const b = s.create('u2', 60_000);
    s.deleteByUser('u1');
    expect(s.get(a1.id)).toBeNull();
    expect(s.get(a2.id)).toBeNull();
    expect(s.get(b.id)).not.toBeNull();
    s.close();
  });
});
