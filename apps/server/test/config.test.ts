import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('reads HA url and token from env', () => {
    const cfg = loadConfig({
      HA_URL: 'http://homeassistant.local:8123',
      HA_TOKEN: 'tok123',
    });
    expect(cfg.haUrl).toBe('http://homeassistant.local:8123');
    expect(cfg.haToken).toBe('tok123');
  });

  it('leaves HA fields null when unset', () => {
    const cfg = loadConfig({});
    expect(cfg.haUrl).toBeNull();
    expect(cfg.haToken).toBeNull();
  });

  it('throws on a non-numeric PORT', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
