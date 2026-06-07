import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';

/**
 * SQLite-backed set of favorite entity IDs (household-shared). Synchronous
 * (better-sqlite3); fine for this small, low-frequency data. Use ':memory:'
 * for tests.
 */
export class FavoritesStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS favorites (entity_id TEXT PRIMARY KEY)',
    );
  }

  list(): string[] {
    const rows = this.db
      .prepare('SELECT entity_id FROM favorites ORDER BY entity_id')
      .all() as { entity_id: string }[];
    return rows.map((r) => r.entity_id);
  }

  set(entityId: string, favorite: boolean): void {
    if (favorite) {
      this.db
        .prepare('INSERT OR IGNORE INTO favorites (entity_id) VALUES (?)')
        .run(entityId);
    } else {
      this.db.prepare('DELETE FROM favorites WHERE entity_id = ?').run(entityId);
    }
  }

  close(): void {
    this.db.close();
  }
}
