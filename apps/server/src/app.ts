import { randomBytes } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';
import { healthRoutes } from './routes/health.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { userManagementRoutes } from './routes/users.js';
import { clientChannel } from './ws/clientChannel.js';
import { registerStatic } from './static.js';
import { HaCache } from './cache/haCache.js';
import { FavoritesStore } from './db/favoritesStore.js';
import { ServerSettingsStore } from './db/serverSettingsStore.js';
import { UsersStore } from './db/usersStore.js';
import { SessionsStore } from './db/sessionsStore.js';
import { InvitesStore } from './db/invitesStore.js';
import { HaSupervisor } from './ha/haSupervisor.js';
import { registerSessionMiddleware } from './auth/session.js';

export interface BuildAppOptions {
  webDir?: string | null;
  /** Inject a cache (tests); a fresh one is created when omitted. */
  cache?: HaCache;
  /** Inject a favorites store (tests); an in-memory one is created when omitted. */
  favorites?: FavoritesStore;
  /** Inject a server-settings store (tests); an in-memory one is created when omitted. */
  serverSettings?: ServerSettingsStore;
  /** Inject auth stores (tests); fresh in-memory ones are created when omitted. */
  users?: UsersStore;
  sessions?: SessionsStore;
  invites?: InvitesStore;
  /**
   * Env-derived boot config used by the HA supervisor as a fallback when no
   * stored override is present.
   */
  envHa?: { url: string | null; token: string | null };
  /** Inject a supervisor (tests). When omitted one is built around the store + env. */
  haSupervisor?: HaSupervisor;
  /** Cookie signing secret. A random one is generated when omitted (tests). */
  cookieSecret?: string;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const cache = opts.cache ?? new HaCache();
  const favorites = opts.favorites ?? new FavoritesStore(':memory:');
  const serverSettings = opts.serverSettings ?? new ServerSettingsStore(':memory:');
  const users = opts.users ?? new UsersStore(':memory:');
  const sessions = opts.sessions ?? new SessionsStore(':memory:');
  const invites = opts.invites ?? new InvitesStore(':memory:');
  const cookieSecret = opts.cookieSecret ?? randomBytes(32).toString('hex');

  const app = Fastify({ logger: false });
  await app.register(fastifyCookie, { secret: cookieSecret });
  await app.register(fastifyWebsocket);

  app.decorate('users', users);
  app.decorate('sessions', sessions);
  app.decorate('invites', invites);
  registerSessionMiddleware(app, users, sessions);

  await app.register(authRoutes);
  await app.register(healthRoutes);
  await app.register(clientChannel, { cache, favorites });

  const supervisor =
    opts.haSupervisor ??
    new HaSupervisor(
      opts.envHa ?? { url: null, token: null },
      serverSettings,
      app.haCache,
      app.clientHub,
    );

  app.decorate('serverSettings', serverSettings);
  app.decorate('haSupervisor', supervisor);

  await app.register(adminRoutes);
  await app.register(userManagementRoutes);
  await registerStatic(app, opts.webDir ?? null);
  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    serverSettings: ServerSettingsStore;
    haSupervisor: HaSupervisor;
    users: UsersStore;
    sessions: SessionsStore;
    invites: InvitesStore;
  }
}
