import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Loads or creates a server-side signing secret used for cookie signing and
 * invite-token HMACs. Precedence:
 *   1. ASPECT_SECRET env var (operator-managed).
 *   2. A file alongside the SQLite DB (`<dbDir>/secret.key`).
 *   3. Newly generated (32 random bytes hex) and persisted to (2).
 *
 * The file is created with 0600 so only the service user can read it.
 *
 * Throws if the resolved secret is too short to be safe.
 */
export function loadOrCreateSecret(env: NodeJS.ProcessEnv, dbPath: string): string {
  const fromEnv = env.ASPECT_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < 32) {
      throw new Error('ASPECT_SECRET must be at least 32 characters.');
    }
    return fromEnv;
  }
  // For tests using :memory:, generate a fresh per-process secret without
  // touching the filesystem.
  if (dbPath === ':memory:') return randomBytes(32).toString('hex');

  const dir = dirname(dbPath);
  const secretPath = join(dir, 'secret.key');
  if (existsSync(secretPath)) {
    const value = readFileSync(secretPath, 'utf8').trim();
    if (value.length >= 32) return value;
    // Fall through to regeneration if the file is corrupt/too short.
  }
  mkdirSync(dir, { recursive: true });
  const value = randomBytes(32).toString('hex');
  writeFileSync(secretPath, value, { encoding: 'utf8' });
  try { chmodSync(secretPath, 0o600); } catch { /* best-effort on Windows */ }
  return value;
}
