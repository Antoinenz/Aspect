import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';

export type Role = 'admin' | 'member';

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface UserWithHash extends UserRow {
  passwordHash: string;
}

/** Strip the hash field for safe API responses. */
export function publicUser(u: UserWithHash | UserRow): UserRow {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ...rest } = 'passwordHash' in u ? (({ passwordHash: _ph, ...r }) => r)(u) : u;
  return rest as UserRow;
}

/**
 * SQLite-backed users table. Passwords are stored as bcrypt hashes (the
 * hashing itself lives in the auth route — this store is hash-agnostic).
 */
export class UsersStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id           TEXT PRIMARY KEY,
        username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role         TEXT NOT NULL CHECK (role IN ('admin','member')),
        created_at   TEXT NOT NULL
      )
    `);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    return row.n;
  }

  create(input: { username: string; displayName: string; passwordHash: string; role: Role }): UserWithHash {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.username, input.displayName, input.passwordHash, input.role, createdAt);
    return {
      id, username: input.username, displayName: input.displayName,
      passwordHash: input.passwordHash, role: input.role, createdAt,
    };
  }

  getByUsername(username: string): UserWithHash | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(username) as Record<string, string> | undefined;
    return row ? rowToUser(row) : null;
  }

  getById(id: string): UserWithHash | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | Record<string, string>
      | undefined;
    return row ? rowToUser(row) : null;
  }

  list(): UserRow[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY created_at')
      .all() as Record<string, string>[];
    return rows.map((r) => {
      const u = rowToUser(r);
      return {
        id: u.id, username: u.username, displayName: u.displayName,
        role: u.role, createdAt: u.createdAt,
      };
    });
  }

  setRole(id: string, role: Role): void {
    this.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }

  setPasswordHash(id: string, passwordHash: string): void {
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}

function rowToUser(row: Record<string, string>): UserWithHash {
  return {
    id: row.id!,
    username: row.username!,
    displayName: row.display_name!,
    passwordHash: row.password_hash!,
    role: row.role as Role,
    createdAt: row.created_at!,
  };
}
