import { describe, it, expect } from 'vitest';
import { UsersStore } from '../../src/db/usersStore.js';

describe('UsersStore', () => {
  it('starts empty', () => {
    const s = new UsersStore(':memory:');
    expect(s.count()).toBe(0);
    expect(s.list()).toEqual([]);
    s.close();
  });

  it('creates and reads a user', () => {
    const s = new UsersStore(':memory:');
    const u = s.create({ username: 'alice', displayName: 'Alice', passwordHash: 'h', role: 'admin' });
    expect(u.id).toBeTypeOf('string');
    expect(s.getByUsername('alice')?.username).toBe('alice');
    expect(s.getByUsername('ALICE')?.username).toBe('alice'); // case-insensitive
    expect(s.getById(u.id)?.passwordHash).toBe('h');
    s.close();
  });

  it('rejects duplicate usernames', () => {
    const s = new UsersStore(':memory:');
    s.create({ username: 'alice', displayName: 'Alice', passwordHash: 'h', role: 'member' });
    expect(() =>
      s.create({ username: 'Alice', displayName: 'Other', passwordHash: 'h2', role: 'member' }),
    ).toThrow();
    s.close();
  });

  it('updates role and password', () => {
    const s = new UsersStore(':memory:');
    const u = s.create({ username: 'a', displayName: 'A', passwordHash: 'h', role: 'member' });
    s.setRole(u.id, 'admin');
    s.setPasswordHash(u.id, 'h2');
    expect(s.getById(u.id)?.role).toBe('admin');
    expect(s.getById(u.id)?.passwordHash).toBe('h2');
    s.close();
  });
});
