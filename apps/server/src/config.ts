export interface AspectConfig {
  /** Port the HTTP/WebSocket server listens on. */
  port: number;
  /** Host interface to bind. */
  host: string;
  /** Absolute path to the built web assets, or null in dev. */
  webDir: string | null;
  /** Base URL of the Home Assistant instance (e.g. http://host:8123), or null. */
  haUrl: string | null;
  /** Long-lived access token for Home Assistant, or null. */
  haToken: string | null;
  /** Path to the SQLite database file (or ':memory:'). */
  dbPath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AspectConfig {
  const port = env.PORT ? Number.parseInt(env.PORT, 10) : 8099;
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT environment variable: "${env.PORT}"`);
  }
  return {
    port,
    host: env.HOST ?? '0.0.0.0',
    webDir: env.ASPECT_WEB_DIR ?? null,
    haUrl: env.HA_URL ?? null,
    haToken: env.HA_TOKEN ?? null,
    dbPath: env.ASPECT_DB ?? 'data/aspect.db',
  };
}
