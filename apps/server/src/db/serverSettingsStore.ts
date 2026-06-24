import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';

export interface StoredServerSettings {
  haUrl: string | null;
  haToken: string | null;
  updatedAt: string | null;
}

/**
 * SQLite-backed singleton row holding admin-configured server settings
 * (currently the Home Assistant URL + long-lived token). When unset, the
 * server falls back to the values from process.env at boot.
 *
 * Single-row enforced by `CHECK (id = 1)`. Synchronous, like FavoritesStore
 * — these writes are rare and small.
 */
export class ServerSettingsStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS server_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ha_url TEXT,
        ha_token TEXT,
        updated_at TEXT
      )
    `);
  }

  get(): StoredServerSettings {
    const row = this.db
      .prepare('SELECT ha_url, ha_token, updated_at FROM server_settings WHERE id = 1')
      .get() as { ha_url: string | null; ha_token: string | null; updated_at: string | null } | undefined;
    if (!row) return { haUrl: null, haToken: null, updatedAt: null };
    return { haUrl: row.ha_url, haToken: row.ha_token, updatedAt: row.updated_at };
  }

  /**
   * Patch the singleton row. Pass `undefined` to leave a field untouched
   * (the admin UI sends the URL on every save but the token only when the
   * operator typed a new one).
   */
  patch(patch: { haUrl?: string | null; haToken?: string | null }): void {
    const current = this.get();
    const nextUrl = patch.haUrl === undefined ? current.haUrl : patch.haUrl;
    const nextToken = patch.haToken === undefined ? current.haToken : patch.haToken;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO server_settings (id, ha_url, ha_token, updated_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           ha_url = excluded.ha_url,
           ha_token = excluded.ha_token,
           updated_at = excluded.updated_at`,
      )
      .run(nextUrl, nextToken, now);
  }

  /** Drop all stored overrides; the server reverts to env defaults. */
  clear(): void {
    this.db.prepare('DELETE FROM server_settings WHERE id = 1').run();
  }

  close(): void {
    this.db.close();
  }
}
