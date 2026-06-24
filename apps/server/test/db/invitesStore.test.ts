import { describe, it, expect } from 'vitest';
import { InvitesStore } from '../../src/db/invitesStore.js';

describe('InvitesStore', () => {
  it('creates an invite and finds it by token', () => {
    const s = new InvitesStore(':memory:');
    const inv = s.create({ role: 'member', createdBy: 'admin-id' });
    expect(s.get(inv.token)?.role).toBe('member');
    s.close();
  });

  it('consume() marks the invite used and refuses to do it twice', () => {
    const s = new InvitesStore(':memory:');
    const inv = s.create({ role: 'member', createdBy: 'admin-id' });
    expect(s.consume(inv.token, 'new-user-id')).toBe(true);
    expect(s.consume(inv.token, 'someone-else')).toBe(false);
    const after = s.get(inv.token);
    expect(after?.usedBy).toBe('new-user-id');
    expect(after?.usedAt).toBeTruthy();
    s.close();
  });

  it('consume() refuses an expired invite', () => {
    const s = new InvitesStore(':memory:');
    const inv = s.create({ role: 'member', createdBy: 'admin-id', ttlMs: -1_000 });
    expect(s.consume(inv.token, 'new-user-id')).toBe(false);
    s.close();
  });

  it('list() returns both invites', () => {
    const s = new InvitesStore(':memory:');
    s.create({ role: 'member', createdBy: 'a' });
    s.create({ role: 'admin', createdBy: 'a' });
    const list = s.list();
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.role).sort()).toEqual(['admin', 'member']);
    s.close();
  });
});
