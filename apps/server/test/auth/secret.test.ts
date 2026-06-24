import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOrCreateSecret } from '../../src/auth/secret.js';

describe('loadOrCreateSecret', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'aspect-secret-'));
  });

  it('uses ASPECT_SECRET when set', () => {
    const env = { ASPECT_SECRET: 'a'.repeat(40) } as NodeJS.ProcessEnv;
    expect(loadOrCreateSecret(env, join(tmp, 'db.sqlite'))).toBe('a'.repeat(40));
  });

  it('throws if ASPECT_SECRET is too short', () => {
    const env = { ASPECT_SECRET: 'short' } as NodeJS.ProcessEnv;
    expect(() => loadOrCreateSecret(env, join(tmp, 'db.sqlite'))).toThrow(/at least 32/);
  });

  it('generates an in-memory secret for :memory: without touching disk', () => {
    const s = loadOrCreateSecret({}, ':memory:');
    expect(s.length).toBeGreaterThanOrEqual(32);
  });

  it('persists a new secret next to the DB and reuses it', () => {
    const db = join(tmp, 'db.sqlite');
    const first = loadOrCreateSecret({}, db);
    const second = loadOrCreateSecret({}, db);
    expect(first).toBe(second);
    const path = join(tmp, 'secret.key');
    expect(readFileSync(path, 'utf8').trim()).toBe(first);
    // Best-effort permission check (skipped on Windows-like FS).
    const mode = statSync(path).mode & 0o777;
    if (process.platform !== 'win32') expect(mode).toBe(0o600);
  });
});
