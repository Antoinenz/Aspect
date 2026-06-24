import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

export interface SessionRow {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Opaque session tokens (256 bits) keyed by random ID. The ID is what we
 * write to the signed cookie. Stored alongside the user so we can revoke
 * individual sessions (e.g. on logout or password change).
 */
export class SessionsStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);
  }

  create(userId: string, ttlMs: number): SessionRow {
    const id = randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + ttlMs);
    this.db
      .prepare(
        'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      )
      .run(id, userId, now.toISOString(), expires.toISOString());
    return { id, userId, createdAt: now.toISOString(), expiresAt: expires.toISOString() };
  }

  get(id: string): SessionRow | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      | { id: string; user_id: string; created_at: string; expires_at: string }
      | undefined;
    if (!row) return null;
    return { id: row.id, userId: row.user_id, createdAt: row.created_at, expiresAt: row.expires_at };
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  deleteByUser(userId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  deleteExpired(): void {
    this.db
      .prepare('DELETE FROM sessions WHERE expires_at < ?')
      .run(new Date().toISOString());
  }

  close(): void {
    this.db.close();
  }
}
