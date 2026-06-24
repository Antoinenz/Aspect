import type {
  Area,
  Device,
  EntityState,
  RegistryEntry,
} from './entities.js';

/** High-level health of the Aspect server. */
export type ServerStatus = 'connecting' | 'online' | 'degraded';

/** Every valid {@link ServerStatus} value, for runtime validation. */
const SERVER_STATUSES: ReadonlySet<string> = new Set<ServerStatus>([
  'connecting',
  'online',
  'degraded',
]);

/** Pushed by the server to every client whenever its status changes. */
export interface StatusMessage {
  type: 'status';
  status: ServerStatus;
  /** Whether the server currently holds a live Home Assistant connection. */
  haConnected: boolean;
  /** Unix epoch milliseconds when the message was created. */
  ts: number;
}

/** Sent once when a client connects (and again after a full registry change). */
export interface SnapshotMessage {
  type: 'snapshot';
  entities: EntityState[];
  areas: Area[];
  devices: Device[];
  registry: RegistryEntry[];
}

/** Sent when one or more entities change or are removed. */
export interface EntityUpdateMessage {
  type: 'entity_update';
  /** Added or changed entities. */
  entities: EntityState[];
  /** Entity IDs that no longer exist. */
  removed: string[];
}

/** The full set of favorite entity IDs; sent on connect and on any change. */
export interface FavoritesMessage {
  type: 'favorites';
  entityIds: string[];
}

/** Reply to a client ping; carries back the same nonce so the client can
 *  compute round-trip time. */
export interface PongMessage {
  type: 'pong';
  /** Echo of the client's ping nonce. */
  nonce: number;
  /** Server's monotonic timestamp for the reply. */
  ts: number;
}

/** Union of every message the server can send to a client. */
export type ServerToClientMessage =
  | StatusMessage
  | SnapshotMessage
  | EntityUpdateMessage
  | FavoritesMessage
  | PongMessage;

/** Sent by a client immediately after connecting. */
export interface HelloMessage {
  type: 'hello';
  clientId: string;
}

/** Asks the server to call a Home Assistant service on one entity. */
export interface CallServiceMessage {
  type: 'call_service';
  domain: string;
  service: string;
  entityId: string;
  data?: Record<string, unknown>;
}

/** Pins or unpins an entity as a favorite. */
export interface SetFavoriteMessage {
  type: 'set_favorite';
  entityId: string;
  favorite: boolean;
}

/** Sets the display order of all favorites; replaces the previous order. */
export interface ReorderFavoritesMessage {
  type: 'reorder_favorites';
  entityIds: string[];
}

/** Liveness probe; the server replies with a `pong` echoing the same nonce. */
export interface PingMessage {
  type: 'ping';
  nonce: number;
}

/** Union of every message a client can send to the server. */
export type ClientToServerMessage =
  | HelloMessage
  | CallServiceMessage
  | SetFavoriteMessage
  | ReorderFavoritesMessage
  | PingMessage;

export function createCallServiceMessage(
  domain: string,
  service: string,
  entityId: string,
  data?: Record<string, unknown>,
): CallServiceMessage {
  return { type: 'call_service', domain, service, entityId, ...(data ? { data } : {}) };
}

export function createSetFavoriteMessage(
  entityId: string,
  favorite: boolean,
): SetFavoriteMessage {
  return { type: 'set_favorite', entityId, favorite };
}

export function isClientToServerMessage(
  value: unknown,
): value is ClientToServerMessage {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  switch (c.type) {
    case 'hello':
      return typeof c.clientId === 'string';
    case 'call_service':
      return (
        typeof c.domain === 'string' &&
        typeof c.service === 'string' &&
        typeof c.entityId === 'string' &&
        (c.data === undefined ||
          (typeof c.data === 'object' && c.data !== null))
      );
    case 'set_favorite':
      return typeof c.entityId === 'string' && typeof c.favorite === 'boolean';
    case 'reorder_favorites':
      return Array.isArray(c.entityIds) && (c.entityIds as unknown[]).every((id) => typeof id === 'string');
    case 'ping':
      return typeof c.nonce === 'number';
    default:
      return false;
  }
}

export function createPingMessage(nonce: number): PingMessage {
  return { type: 'ping', nonce };
}

export function createPongMessage(nonce: number): PongMessage {
  return { type: 'pong', nonce, ts: Date.now() };
}

export function createStatusMessage(
  status: ServerStatus,
  haConnected: boolean,
): StatusMessage {
  return { type: 'status', status, haConnected, ts: Date.now() };
}

export function createSnapshotMessage(snapshot: {
  entities: EntityState[];
  areas: Area[];
  devices: Device[];
  registry: RegistryEntry[];
}): SnapshotMessage {
  return { type: 'snapshot', ...snapshot };
}

export function createEntityUpdateMessage(
  entities: EntityState[],
  removed: string[] = [],
): EntityUpdateMessage {
  return { type: 'entity_update', entities, removed };
}

export function createFavoritesMessage(entityIds: string[]): FavoritesMessage {
  return { type: 'favorites', entityIds };
}

export function createReorderFavoritesMessage(entityIds: string[]): ReorderFavoritesMessage {
  return { type: 'reorder_favorites', entityIds };
}

export function isServerToClientMessage(
  value: unknown,
): value is ServerToClientMessage {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  switch (c.type) {
    case 'status':
      return (
        typeof c.status === 'string' &&
        SERVER_STATUSES.has(c.status) &&
        typeof c.haConnected === 'boolean' &&
        typeof c.ts === 'number'
      );
    case 'snapshot':
      return (
        Array.isArray(c.entities) &&
        Array.isArray(c.areas) &&
        Array.isArray(c.devices) &&
        Array.isArray(c.registry)
      );
    case 'entity_update':
      return Array.isArray(c.entities) && Array.isArray(c.removed);
    case 'favorites':
      return Array.isArray(c.entityIds);
    case 'pong':
      return typeof c.nonce === 'number' && typeof c.ts === 'number';
    default:
      return false;
  }
}
