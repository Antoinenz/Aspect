import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import type { Role } from './usersStore.js';

export interface InviteRow {
  token: string;
  role: Role;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Single-use invite tokens that an admin generates and shares with someone
 * joining the home. Consuming an invite is what authorizes /api/auth/signup
 * once the first admin exists; the invite captures the role they'll have.
 */
export class InvitesStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invites (
        token      TEXT PRIMARY KEY,
        role       TEXT NOT NULL CHECK (role IN ('admin','member')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at    TEXT,
        used_by    TEXT
      )
    `);
  }

  create(input: { role: Role; createdBy: string; ttlMs?: number }): InviteRow {
    const token = randomBytes(18).toString('base64url');
    const now = new Date();
    const expires = new Date(now.getTime() + (input.ttlMs ?? DEFAULT_TTL_MS));
    this.db
      .prepare(
        `INSERT INTO invites (token, role, created_by, created_at, expires_at, used_at, used_by)
         VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .run(token, input.role, input.createdBy, now.toISOString(), expires.toISOString());
    return {
      token, role: input.role, createdBy: input.createdBy,
      createdAt: now.toISOString(), expiresAt: expires.toISOString(),
      usedAt: null, usedBy: null,
    };
  }

  get(token: string): InviteRow | null {
    const row = this.db.prepare('SELECT * FROM invites WHERE token = ?').get(token) as
      | Record<string, string | null>
      | undefined;
    return row ? toInvite(row) : null;
  }

  list(): InviteRow[] {
    const rows = this.db
      .prepare('SELECT * FROM invites ORDER BY created_at DESC, token DESC')
      .all() as Record<string, string | null>[];
    return rows.map(toInvite);
  }

  /**
   * Atomically mark the invite consumed, but only if it's still valid (not
   * already used and not expired). Returns true on success.
   */
  consume(token: string, userId: string): boolean {
    const now = new Date().toISOString();
    const res = this.db
      .prepare(
        `UPDATE invites SET used_at = ?, used_by = ?
         WHERE token = ? AND used_at IS NULL AND expires_at >= ?`,
      )
      .run(now, userId, token, now);
    return res.changes === 1;
  }

  delete(token: string): void {
    this.db.prepare('DELETE FROM invites WHERE token = ?').run(token);
  }

  close(): void {
    this.db.close();
  }
}

function toInvite(row: Record<string, string | null>): InviteRow {
  return {
    token: row.token!,
    role: row.role as Role,
    createdBy: row.created_by!,
    createdAt: row.created_at!,
    expiresAt: row.expires_at!,
    usedAt: row.used_at ?? null,
    usedBy: row.used_by ?? null,
  };
}
