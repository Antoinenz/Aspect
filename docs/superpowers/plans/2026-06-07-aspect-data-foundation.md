# Aspect — UI Overhaul Plan 1: Data Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the data groundwork for the Apple-style UI overhaul with no UI changes: surface the entity-registry fields needed for filtering (`entityCategory`, `hidden`, `disabled`, `deviceClass`) all the way to the client, and add a server-persisted, synced **favorites** store with its client↔server messages and client-side plumbing.

**Architecture:** Extend the shared `RegistryEntry` type and the server's `normalizeRegistryEntry` so the existing snapshot carries the new fields automatically. Add a SQLite-backed `FavoritesStore` (better-sqlite3) and two new messages reusing the existing WebSocket channel: a `favorites` snapshot (server→client, sent on connect and on change) and a `set_favorite` command (client→server). The `ClientHub` owns favorites fan-out the same way it owns status/snapshot. The client store gains a `favorites` list and appliers; no components change yet.

**Tech Stack:** unchanged + **better-sqlite3** (server, native, prebuilt binaries for Node 22 on Windows/Linux). tsup already keeps node deps external, so the native module is required at runtime, not bundled.

**Prerequisite:** Plans 1–4 merged. Local pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if `pnpm` is not found.

---

## File Structure

```
packages/shared/src/
  entities.ts            MOD  extend RegistryEntry (entityCategory, hidden, disabled, deviceClass)
  messages.ts            MOD  add FavoritesMessage (s→c) + SetFavoriteMessage (c→s) + factories + guards
  messages.test.ts       MOD

apps/server/src/
  config.ts              MOD  add dbPath
  ha/normalize.ts        MOD  map entity_category/hidden_by/disabled_by/device_class
  db/favoritesStore.ts   NEW  SQLite-backed favorites
  ws/clientChannel.ts    MOD  ClientHub gets favoritesStore: send on connect, broadcast, handle set_favorite
  app.ts                 MOD  create/inject favoritesStore, pass to clientChannel
  start.ts               MOD  create file-backed FavoritesStore from config.dbPath
apps/server/test/
  ha/normalize.test.ts   MOD  expect new registry fields
  db/favoritesStore.test.ts NEW
  clientChannel.test.ts  MOD  favorites greet + set_favorite handling
  favoritesFlow.test.ts  NEW  full stack: client set_favorite -> persisted -> rebroadcast

apps/web/src/
  store/connectionStore.ts      MOD  favorites: string[] + applyFavorites
  store/connectionStore.test.ts MOD
  server-client/messageHandler.ts MOD  handle 'favorites'
  server-client/messageHandler.test.ts MOD
  server-client/commands.ts     MOD  setFavorite()
  server-client/commands.test.ts MOD
```

---

## Task 1: Extend RegistryEntry with filtering fields

**Files:** Modify `packages/shared/src/entities.ts`, `apps/server/src/ha/normalize.ts`, `apps/server/test/ha/normalize.test.ts`, plus the two test constructors that build a full `RegistryEntry` (`apps/web/src/dashboard/rooms.test.ts`, `apps/web/src/dashboard/Dashboard.test.tsx`).

- [ ] **Step 1: Extend `RegistryEntry` in `packages/shared/src/entities.ts`.** Replace the `RegistryEntry` interface with:

```ts
export type EntityCategory = 'config' | 'diagnostic';

/** A Home Assistant entity-registry entry (links an entity to a device/area). */
export interface RegistryEntry {
  entityId: string;
  deviceId: string | null;
  areaId: string | null;
  /** User-given or original friendly name, if any. */
  name: string | null;
  platform: string;
  /** 'config'/'diagnostic' entities are hidden from the main views. */
  entityCategory: EntityCategory | null;
  /** True if HA marks the entity hidden. */
  hidden: boolean;
  /** True if HA marks the entity disabled. */
  disabled: boolean;
  /** e.g. 'battery', 'temperature', 'motion' — drives icons & battery grouping. */
  deviceClass: string | null;
}
```

- [ ] **Step 2: Update the failing test `apps/server/test/ha/normalize.test.ts`.** Replace BOTH `normalizeRegistryEntry` test cases with versions that include the new fields:

```ts
describe('normalizeRegistryEntry', () => {
  it('maps name (preferred), category, hidden/disabled, device_class', () => {
    expect(
      normalizeRegistryEntry({
        entity_id: 'light.kitchen',
        device_id: 'dev1',
        area_id: null,
        name: 'My Light',
        original_name: 'Light',
        platform: 'hue',
        entity_category: null,
        hidden_by: null,
        disabled_by: null,
        device_class: null,
      }),
    ).toEqual({
      entityId: 'light.kitchen',
      deviceId: 'dev1',
      areaId: null,
      name: 'My Light',
      platform: 'hue',
      entityCategory: null,
      hidden: false,
      disabled: false,
      deviceClass: null,
    });
  });

  it('falls back to original_name and maps diagnostic/hidden/device_class', () => {
    const r = normalizeRegistryEntry({
      entity_id: 'sensor.x_battery',
      device_id: 'dev2',
      area_id: 'kitchen',
      name: null,
      original_name: 'Battery',
      platform: 'hue',
      entity_category: 'diagnostic',
      hidden_by: 'user',
      disabled_by: null,
      device_class: 'battery',
    });
    expect(r.name).toBe('Battery');
    expect(r.entityCategory).toBe('diagnostic');
    expect(r.hidden).toBe(true);
    expect(r.disabled).toBe(false);
    expect(r.deviceClass).toBe('battery');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @aspect/server test:run normalize`
Expected: FAIL — output is missing the new fields.

- [ ] **Step 4: Update `RawRegistryEntry` and `normalizeRegistryEntry` in `apps/server/src/ha/normalize.ts`.** Replace the `RawRegistryEntry` interface and the `normalizeRegistryEntry` function with:

```ts
export interface RawRegistryEntry {
  entity_id: string;
  device_id: string | null;
  area_id: string | null;
  name: string | null;
  original_name?: string | null;
  platform: string;
  entity_category?: 'config' | 'diagnostic' | null;
  hidden_by?: string | null;
  disabled_by?: string | null;
  device_class?: string | null;
}

export function normalizeRegistryEntry(raw: RawRegistryEntry): RegistryEntry {
  return {
    entityId: raw.entity_id,
    deviceId: raw.device_id,
    areaId: raw.area_id,
    name: raw.name ?? raw.original_name ?? null,
    platform: raw.platform,
    entityCategory: raw.entity_category ?? null,
    hidden: raw.hidden_by != null,
    disabled: raw.disabled_by != null,
    deviceClass: raw.device_class ?? null,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aspect/server test:run normalize`
Expected: PASS.

- [ ] **Step 6: Fix the two web test constructors that build a full `RegistryEntry`.**

In `apps/web/src/dashboard/rooms.test.ts`, replace the `reg` helper with one that includes the new required fields:

```ts
const reg = (
  entityId: string,
  areaId: string | null,
  deviceId: string | null = null,
  name: string | null = null,
): RegistryEntry => ({
  entityId,
  areaId,
  deviceId,
  name,
  platform: 'demo',
  entityCategory: null,
  hidden: false,
  disabled: false,
  deviceClass: null,
});
```

In `apps/web/src/dashboard/Dashboard.test.tsx`, the inline registry entry in the "renders room sections with tiles" test must add the new fields. Replace that registry array element with:

```ts
        registry: [
          {
            entityId: 'light.kitchen_lamp',
            areaId: 'kitchen',
            deviceId: null,
            name: null,
            platform: 'demo',
            entityCategory: null,
            hidden: false,
            disabled: false,
            deviceClass: null,
          },
        ],
```

- [ ] **Step 7: Verify shared + web typecheck and tests pass**

Run: `pnpm --filter @aspect/shared typecheck && pnpm --filter @aspect/web test:run dashboard && pnpm --filter @aspect/web typecheck`
Expected: PASS (rooms + Dashboard tests still green with the new fields).

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/entities.ts apps/server/src/ha/normalize.ts apps/server/test/ha/normalize.test.ts apps/web/src/dashboard/rooms.test.ts apps/web/src/dashboard/Dashboard.test.tsx
git commit -m "feat(shared): carry entity category/hidden/device_class in registry"
```

---

## Task 2: SQLite favorites store

**Files:** Modify `apps/server/package.json`, `apps/server/src/config.ts`; Create `apps/server/src/db/favoritesStore.ts`, `apps/server/test/db/favoritesStore.test.ts`

- [ ] **Step 1: Add `better-sqlite3` to `apps/server/package.json` dependencies** (keep existing):

```json
    "better-sqlite3": "11.8.1"
```

And add its types to devDependencies:

```json
    "@types/better-sqlite3": "7.6.12"
```

Then run: `pnpm install`
Expected: installs with a prebuilt native binary (no compiler errors). If the install tries to compile from source and fails, report it.

- [ ] **Step 2: Add `dbPath` to `apps/server/src/config.ts`.** Add the field to `AspectConfig` and `loadConfig`:

In the interface add:
```ts
  /** Path to the SQLite database file (or ':memory:'). */
  dbPath: string;
```
In the returned object add:
```ts
    dbPath: env.ASPECT_DB ?? 'data/aspect.db',
```

- [ ] **Step 3: Write the failing test `apps/server/test/db/favoritesStore.test.ts`**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { FavoritesStore } from '../../src/db/favoritesStore.js';

let store: FavoritesStore | undefined;

afterEach(() => {
  store?.close();
  store = undefined;
});

describe('FavoritesStore', () => {
  it('starts empty', () => {
    store = new FavoritesStore(':memory:');
    expect(store.list()).toEqual([]);
  });

  it('adds, lists sorted, and is idempotent', () => {
    store = new FavoritesStore(':memory:');
    store.set('light.b', true);
    store.set('light.a', true);
    store.set('light.a', true); // idempotent
    expect(store.list()).toEqual(['light.a', 'light.b']);
  });

  it('removes a favorite', () => {
    store = new FavoritesStore(':memory:');
    store.set('light.a', true);
    store.set('light.a', false);
    expect(store.list()).toEqual([]);
  });

  it('removing a non-existent favorite is a no-op', () => {
    store = new FavoritesStore(':memory:');
    expect(() => store!.set('light.ghost', false)).not.toThrow();
    expect(store.list()).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @aspect/server test:run favoritesStore`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `apps/server/src/db/favoritesStore.ts`**

```ts
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @aspect/server test:run favoritesStore`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/server/package.json apps/server/src/config.ts apps/server/src/db/favoritesStore.ts apps/server/test/db/favoritesStore.test.ts pnpm-lock.yaml
git commit -m "feat(server): add SQLite favorites store"
```

---

## Task 3: Favorites messages

**Files:** Modify `packages/shared/src/messages.ts`, `packages/shared/src/messages.test.ts`

- [ ] **Step 1: Add the favorites messages to `packages/shared/src/messages.ts`.**

Add the server→client message interface (near `EntityUpdateMessage`):
```ts
/** The full set of favorite entity IDs; sent on connect and on any change. */
export interface FavoritesMessage {
  type: 'favorites';
  entityIds: string[];
}
```
Add it to the `ServerToClientMessage` union:
```ts
export type ServerToClientMessage =
  | StatusMessage
  | SnapshotMessage
  | EntityUpdateMessage
  | FavoritesMessage;
```
Add a factory:
```ts
export function createFavoritesMessage(entityIds: string[]): FavoritesMessage {
  return { type: 'favorites', entityIds };
}
```
Add a `case` to `isServerToClientMessage`'s switch (before `default`):
```ts
    case 'favorites':
      return Array.isArray(c.entityIds);
```

Add the client→server message interface (near `CallServiceMessage`):
```ts
/** Pins or unpins an entity as a favorite. */
export interface SetFavoriteMessage {
  type: 'set_favorite';
  entityId: string;
  favorite: boolean;
}
```
Add it to the `ClientToServerMessage` union:
```ts
export type ClientToServerMessage =
  | HelloMessage
  | CallServiceMessage
  | SetFavoriteMessage;
```
Add a factory:
```ts
export function createSetFavoriteMessage(
  entityId: string,
  favorite: boolean,
): SetFavoriteMessage {
  return { type: 'set_favorite', entityId, favorite };
}
```
Add a `case` to `isClientToServerMessage`'s switch (before `default`):
```ts
    case 'set_favorite':
      return typeof c.entityId === 'string' && typeof c.favorite === 'boolean';
```

- [ ] **Step 2: Add tests to `packages/shared/src/messages.test.ts`.** Add `createFavoritesMessage` and `createSetFavoriteMessage` to the existing import from `./messages.js`, then add:

```ts
describe('favorites messages', () => {
  it('builds and validates a favorites (server) message', () => {
    const msg = createFavoritesMessage(['light.a', 'light.b']);
    expect(msg).toEqual({ type: 'favorites', entityIds: ['light.a', 'light.b'] });
    expect(isServerToClientMessage(msg)).toBe(true);
  });

  it('builds and validates a set_favorite (client) message', () => {
    const msg = createSetFavoriteMessage('light.a', true);
    expect(msg).toEqual({ type: 'set_favorite', entityId: 'light.a', favorite: true });
    expect(isClientToServerMessage(msg)).toBe(true);
  });

  it('rejects a malformed set_favorite', () => {
    expect(isClientToServerMessage({ type: 'set_favorite', entityId: 'x' })).toBe(false);
  });
});
```

Ensure `isClientToServerMessage` is in the import list (it was added in Plan 4).

- [ ] **Step 3: Run + typecheck**

Run: `pnpm --filter @aspect/shared test:run && pnpm --filter @aspect/shared typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add favorites snapshot + set_favorite messages"
```

---

## Task 4: Wire favorites into the server

**Files:** Modify `apps/server/src/ws/clientChannel.ts`, `apps/server/src/app.ts`, `apps/server/src/start.ts`, `apps/server/test/clientChannel.test.ts`; Create `apps/server/test/favoritesFlow.test.ts`

- [ ] **Step 1: Give `ClientHub` the favorites store and behavior.** In `apps/server/src/ws/clientChannel.ts`:

Add imports — extend the `@aspect/shared` import to include `createFavoritesMessage`, and import the store type:
```ts
import { createFavoritesMessage /* , existing imports */ } from '@aspect/shared';
import type { FavoritesStore } from '../db/favoritesStore.js';
```

Change the `ClientHub` constructor to accept the store and store it:
```ts
  constructor(
    private readonly cache: HaCache,
    private readonly favorites: FavoritesStore,
  ) {}
```

In `add(socket)`, after sending the status + snapshot, also send the favorites:
```ts
    this.send(socket, createFavoritesMessage(this.favorites.list()));
```

Add a broadcast helper:
```ts
  broadcastFavorites(): void {
    this.broadcast(createFavoritesMessage(this.favorites.list()));
  }
```

In `handleClientMessage`, after the existing `call_service` handling, add `set_favorite`:
```ts
    if (parsed.type === 'set_favorite') {
      this.favorites.set(parsed.entityId, parsed.favorite);
      this.broadcastFavorites();
    }
```

- [ ] **Step 2: Create/inject the store in `apps/server/src/app.ts`.** Update `BuildAppOptions` and `buildApp`:

```ts
import { FavoritesStore } from './db/favoritesStore.js';

export interface BuildAppOptions {
  webDir?: string | null;
  cache?: HaCache;
  /** Inject a store (tests); an in-memory one is created when omitted. */
  favorites?: FavoritesStore;
}

export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const cache = opts.cache ?? new HaCache();
  const favorites = opts.favorites ?? new FavoritesStore(':memory:');
  const app = Fastify({ logger: false });
  await app.register(fastifyWebsocket);
  await app.register(healthRoutes);
  await app.register(clientChannel, { cache, favorites });
  await registerStatic(app, opts.webDir ?? null);
  return app;
}
```

Update `ClientChannelOptions` and the `clientChannel` plugin in `clientChannel.ts` to pass the store into `ClientHub`:
```ts
export interface ClientChannelOptions {
  cache: HaCache;
  favorites: FavoritesStore;
}
```
and inside the plugin:
```ts
    const hub = new ClientHub(opts.cache, opts.favorites);
```

- [ ] **Step 2b: Use a file-backed store in `apps/server/src/start.ts`.** Create it from config and pass to `buildApp`:
```ts
import { FavoritesStore } from './db/favoritesStore.js';
// ...
  const app = await buildApp({
    webDir: config.webDir,
    favorites: new FavoritesStore(config.dbPath),
  });
```
(Replace the existing `const app = await buildApp({ webDir: config.webDir });` line.)

- [ ] **Step 3: Add unit tests to `apps/server/test/clientChannel.test.ts`.** The existing tests construct `new ClientHub(cache)` and `buildApp({ cache })` — these now need a favorites store. Update them and add new cases.

At the top, import the store:
```ts
import { FavoritesStore } from '../src/db/favoritesStore.js';
```
Replace existing `new ClientHub(cache)` / `new ClientHub(new HaCache())` constructions with `new ClientHub(cache, new FavoritesStore(':memory:'))` (and `new ClientHub(new HaCache(), new FavoritesStore(':memory:'))`). For `buildApp({ cache })` calls, leave as-is (buildApp defaults an in-memory store).

**Also update `apps/server/test/ha/connection.test.ts`:** it constructs `new ClientHub(cache)` — add the same import and change it to `new ClientHub(cache, new FavoritesStore(':memory:'))`. (Search the whole `apps/server/test/` tree for `new ClientHub(` and ensure every call passes a `FavoritesStore`.)

Add a new describe block:
```ts
describe('ClientHub favorites', () => {
  it('persists and rebroadcasts a set_favorite', () => {
    const store = new FavoritesStore(':memory:');
    const hub = new ClientHub(new HaCache(), store);
    hub.handleClientMessage(
      JSON.stringify({ type: 'set_favorite', entityId: 'light.a', favorite: true }),
    );
    expect(store.list()).toEqual(['light.a']);
    store.close();
  });
});
```

Also update the existing "greets a new client with a status then a snapshot" test: a third message (favorites) now follows. If that test collects exactly 2 messages it still passes (status, snapshot arrive first). The favorites message arrives third; no change needed unless it asserts message count — leave the 2-message collection as-is.

- [ ] **Step 4: Write the full-stack test `apps/server/test/favoritesFlow.test.ts`**

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import {
  createSetFavoriteMessage,
  type ServerToClientMessage,
} from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { HaCache } from '../src/cache/haCache.js';
import { FavoritesStore } from '../src/db/favoritesStore.js';
import { listen } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('favorites flow', () => {
  it('persists a pin from a client and rebroadcasts the favorites list', async () => {
    const favorites = new FavoritesStore(':memory:');
    app = await buildApp({ cache: new HaCache(), favorites });
    const base = await listen(app);

    const received: ServerToClientMessage[] = [];
    const socket = new WebSocket(`${base}/ws`);
    socket.on('message', (d) =>
      received.push(JSON.parse(d.toString()) as ServerToClientMessage),
    );
    await new Promise<void>((resolve) => socket.on('open', resolve));

    // Initial favorites snapshot is empty.
    await vi.waitFor(() => {
      const fav = received.find((m) => m.type === 'favorites');
      expect(fav?.type).toBe('favorites');
      if (fav?.type === 'favorites') expect(fav.entityIds).toEqual([]);
    });

    socket.send(JSON.stringify(createSetFavoriteMessage('light.kitchen', true)));

    await vi.waitFor(() => {
      const fav = [...received].reverse().find((m) => m.type === 'favorites');
      if (fav?.type === 'favorites') {
        expect(fav.entityIds).toEqual(['light.kitchen']);
      } else {
        throw new Error('no favorites update yet');
      }
    });
    expect(favorites.list()).toEqual(['light.kitchen']);
    socket.close();
  });
});
```

- [ ] **Step 5: Run server tests, typecheck, build**

Run: `pnpm --filter @aspect/server test:run && pnpm --filter @aspect/server typecheck && pnpm --filter @aspect/server build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server
git commit -m "feat(server): persist and sync favorites over the client channel"
```

---

## Task 5: Client favorites plumbing (no UI)

**Files:** Modify `apps/web/src/store/connectionStore.ts`, `apps/web/src/store/connectionStore.test.ts`, `apps/web/src/server-client/messageHandler.ts`, `apps/web/src/server-client/messageHandler.test.ts`, `apps/web/src/server-client/commands.ts`, `apps/web/src/server-client/commands.test.ts`

- [ ] **Step 1: Add favorites to `apps/web/src/store/connectionStore.ts`.**

Add to the `ConnectionState` interface:
```ts
  favorites: string[];
  applyFavorites: (entityIds: string[]) => void;
```
Add to the store's initial state (next to `registry: []`):
```ts
  favorites: [],
```
Add the action (next to `applyEntityUpdate`):
```ts
  applyFavorites: (favorites) => set({ favorites }),
```

- [ ] **Step 2: Add a store test to `apps/web/src/store/connectionStore.test.ts`.** Add `favorites: []` to the `reset` object's fields, and add:
```ts
  it('applies a favorites list', () => {
    useConnectionStore.getState().applyFavorites(['light.a', 'scene.movie']);
    expect(useConnectionStore.getState().favorites).toEqual(['light.a', 'scene.movie']);
  });
```

- [ ] **Step 3: Handle the `favorites` message in `apps/web/src/server-client/messageHandler.ts`.** Add a case to the switch:
```ts
    case 'favorites':
      store.applyFavorites(parsed.entityIds);
      return;
```

- [ ] **Step 4: Add a handler test to `apps/web/src/server-client/messageHandler.test.ts`.** Add `createFavoritesMessage` to the import from `@aspect/shared`, add `favorites: []` to the `setState` reset in `beforeEach`, and add:
```ts
  it('applies a favorites message', () => {
    handleRawMessage(JSON.stringify(createFavoritesMessage(['light.a'])));
    expect(useConnectionStore.getState().favorites).toEqual(['light.a']);
  });
```

- [ ] **Step 5: Add `setFavorite` to `apps/web/src/server-client/commands.ts`.**
```ts
import { createCallServiceMessage, createSetFavoriteMessage } from '@aspect/shared';
// ...existing callService...

/** Pins or unpins an entity as a favorite. */
export function setFavorite(entityId: string, favorite: boolean): void {
  sendToServer(createSetFavoriteMessage(entityId, favorite));
}
```

- [ ] **Step 6: Add a commands test to `apps/web/src/server-client/commands.test.ts`.** Add to the file:
```ts
import { setFavorite } from './commands.js';

describe('setFavorite', () => {
  beforeEach(() => {
    sent.length = 0;
  });
  it('sends a set_favorite message', () => {
    setFavorite('light.a', true);
    expect(sent[0]).toEqual({ type: 'set_favorite', entityId: 'light.a', favorite: true });
  });
});
```
(`setFavorite` can be added to the existing top import of `./commands.js` instead of a second import if preferred.)

- [ ] **Step 7: Run web tests, typecheck**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/store apps/web/src/server-client
git commit -m "feat(web): client favorites state, handler, and command"
```

---

## Task 6: Full verification

**Files:** none committed

- [ ] **Step 1: Whole workspace (what CI runs)**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass (shared/server/web).

- [ ] **Step 2: Smoke the favorites persistence path**

Run: `pnpm --filter @aspect/server test:run favoritesFlow`
Expected: PASS — a client pin persists to SQLite and rebroadcasts.

- [ ] **Step 3: Confirm clean tree** (no stray `data/` or `*.db` committed — they are gitignored)

Run: `git status --short`
Expected: empty.

- [ ] **Step 4: No commit** (verification only).

---

## Definition of Done

- [ ] `RegistryEntry` carries `entityCategory`, `hidden`, `disabled`, `deviceClass` from HA to the client (proven by normalize tests; flows via the existing snapshot).
- [ ] A SQLite `FavoritesStore` persists favorites; the server sends them on connect and rebroadcasts on change; a client `set_favorite` persists and syncs (proven by `favoritesFlow.test.ts`).
- [ ] The client store holds `favorites` and exposes `applyFavorites`; `setFavorite()` command exists.
- [ ] `pnpm typecheck`, `pnpm test:run`, `pnpm build` all pass; no DB files committed.

## Notes for the Next Plan (UI Overhaul Plan 2 — Design System)

- Filtering and battery-grouping logic (using the new `entityCategory`/`deviceClass`) lands in UI Plan 3 (App shell + Room tabs), consuming the fields shipped here.
- The favorites data is now available client-side (`useConnectionStore().favorites` + `setFavorite()`); the Quick Access UI (UI Plan 5) and pin affordances consume it.
- Next plan introduces Tailwind v4 + Radix + `@mdi/js` and the squircle/Tile/Sheet/Tabs primitives.
