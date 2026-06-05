export interface AspectConfig {
  /** Port the HTTP/WebSocket server listens on. */
  port: number;
  /** Host interface to bind. */
  host: string;
  /** Absolute path to the built web assets, or null in dev. */
  webDir: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AspectConfig {
  return {
    port: env.PORT ? Number.parseInt(env.PORT, 10) : 8099,
    host: env.HOST ?? '0.0.0.0',
    webDir: env.ASPECT_WEB_DIR ?? null,
  };
}
