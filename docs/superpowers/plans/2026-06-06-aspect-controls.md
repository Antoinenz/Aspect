# Aspect — Domain Controls (call_service channel + per-domain controls) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Aspect functional: a client→server `call_service` channel so the browser can control Home Assistant through the Aspect server (the server stays the sole HA client), optimistic updates for instant feedback reconciled against authoritative state, and per-domain controls in the detail sheet for every controllable domain in this home — light (toggle/brightness/color-temp), switch, scene, cover (open/close/stop/position), climate (target temp/hvac mode), plus generic lock & fan; quick actions for script/automation/button; helpers select & number; and media_player (play/pause, track, volume, source).

**Non-goal:** Visual polish. Controls use plain, serviceable HTML (range/select/buttons) — the dedicated UI pass comes later. Favorites/edit/persistence is a later plan.

**Architecture:** A new shared `CallServiceMessage` (client→server). The server's `ClientHub` gains a service-caller it invokes when a client sends `call_service`; the HA connection layer exposes `callService` (via `home-assistant-js-websocket`). On the client, the socket becomes bidirectional (`sendToServer`), a small `commands.ts` builds service calls, and the store gains `applyOptimistic` for instant feedback that the next authoritative `entity_update` overwrites. Controls live in `apps/web/src/controls/`, dispatched by domain inside `EntityDetailSheet`.

**Tech Stack:** unchanged. New server dep: none (`callService` is in `home-assistant-js-websocket`). The mock HA server records `call_service` for tests.

**Prerequisite:** Plan 3 merged. Real-home facts driving this plan (from the home export): lights expose `brightness` (0–255), `color_temp_kelvin` with `min/max_color_temp_kelvin`, and `supported_color_modes`; climate state is the hvac mode with `hvac_modes`, `temperature`, `current_temperature`, `min_temp`/`max_temp`/`target_temp_step`; covers expose `current_position`; media_players expose `volume_level`, `source_list`, `media_title`, `supported_features`. No `lock`/`fan` entities exist here (implemented generically, untested against this home). Local pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if needed.

---

## File Structure

```
packages/shared/src/
  messages.ts            MOD  add CallServiceMessage + factory + isClientToServerMessage
  messages.test.ts       MOD

apps/server/src/
  ha/connection.ts       MOD  expose callService on the handle
  ws/clientChannel.ts    MOD  ClientHub.setServiceCaller + handleClientMessage; /ws onmessage
  start.ts               MOD  wire clientHub.setServiceCaller to ha.callService
apps/server/test/
  helpers/mockHaServer.ts MOD  record call_service + getServiceCalls()
  clientChannel.test.ts  MOD  client call_service -> serviceCaller invoked
  controlFlow.test.ts    NEW  full stack: client ws call_service -> mock HA records it

apps/web/src/
  server-client/socket.ts        MOD  expose sendToServer()
  server-client/commands.ts      NEW  callService() + typed helpers
  server-client/commands.test.ts NEW
  store/connectionStore.ts       MOD  applyOptimistic()
  store/connectionStore.test.ts  MOD
  controls/
    ControlsFor.tsx        NEW  domain dispatcher
    ActionButton.tsx       NEW  shared styled button
    LightControls.tsx      NEW
    CoverControls.tsx      NEW
    ClimateControls.tsx    NEW
    ToggleControls.tsx     NEW  switch / fan / lock (+ fan % )
    QuickAction.tsx        NEW  scene / script / automation / button
    HelperControls.tsx     NEW  select / number
    MediaPlayerControls.tsx NEW
    ControlsFor.test.tsx   NEW
    LightControls.test.tsx NEW
  dashboard/EntityDetailSheet.tsx MOD  render ControlsFor instead of "coming soon"
```

---

## Task 1: Shared call_service message

**Files:** Modify `packages/shared/src/messages.ts`, `packages/shared/src/messages.test.ts`

- [ ] **Step 1: Add to `packages/shared/src/messages.ts`** — replace the `HelloMessage`/`ClientToServerMessage` block with:

```ts
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

/** Union of every message a client can send to the server. */
export type ClientToServerMessage = HelloMessage | CallServiceMessage;

export function createCallServiceMessage(
  domain: string,
  service: string,
  entityId: string,
  data?: Record<string, unknown>,
): CallServiceMessage {
  return { type: 'call_service', domain, service, entityId, ...(data ? { data } : {}) };
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
    default:
      return false;
  }
}
```

- [ ] **Step 2: Add tests to `packages/shared/src/messages.test.ts`** (append inside the file, after the existing imports add `createCallServiceMessage, isClientToServerMessage` to the import from `./messages.js`):

```ts
describe('createCallServiceMessage / isClientToServerMessage', () => {
  it('builds a call_service message with optional data', () => {
    const msg = createCallServiceMessage('light', 'turn_on', 'light.k', {
      brightness_pct: 50,
    });
    expect(msg).toEqual({
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      entityId: 'light.k',
      data: { brightness_pct: 50 },
    });
    expect(isClientToServerMessage(msg)).toBe(true);
  });

  it('omits data when not provided', () => {
    const msg = createCallServiceMessage('switch', 'toggle', 'switch.x');
    expect('data' in msg).toBe(false);
    expect(isClientToServerMessage(msg)).toBe(true);
  });

  it('rejects malformed client messages', () => {
    expect(isClientToServerMessage({ type: 'call_service', domain: 'light' })).toBe(false);
    expect(isClientToServerMessage({ type: 'nope' })).toBe(false);
    expect(isClientToServerMessage(null)).toBe(false);
  });
});
```

You must add `createCallServiceMessage, isClientToServerMessage` to the existing `import { ... } from './messages.js';` line.

- [ ] **Step 3: Run + typecheck**

Run: `pnpm --filter @aspect/shared test:run && pnpm --filter @aspect/shared typecheck`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add call_service client message + guard"
```

---

## Task 2: Server — service caller wiring + mock support

**Files:** Modify `apps/server/src/ha/connection.ts`, `apps/server/src/ws/clientChannel.ts`, `apps/server/src/start.ts`, `apps/server/test/helpers/mockHaServer.ts`, `apps/server/test/clientChannel.test.ts`; Create `apps/server/test/controlFlow.test.ts`

- [ ] **Step 1: Expose `callService` from the HA connection.** In `apps/server/src/ha/connection.ts`:

Add `callService` to the imports from `home-assistant-js-websocket`:
```ts
import {
  createConnection,
  createLongLivedTokenAuth,
  getStates,
  callService,
  type Connection,
} from 'home-assistant-js-websocket';
```

Extend `HaConnectionHandle`:
```ts
export interface HaConnectionHandle {
  connection: Connection;
  callService: (
    domain: string,
    service: string,
    entityId: string,
    data?: Record<string, unknown>,
  ) => Promise<void>;
  stop: () => void;
}
```

In the returned object (currently `{ connection, stop }`), add the caller:
```ts
  return {
    connection,
    callService: async (domain, service, entityId, data) => {
      await callService(connection, domain, service, data, { entity_id: entityId });
    },
    stop: () => connection.close(),
  };
```

- [ ] **Step 2: Add the service caller + inbound message handling to `ClientHub`.** In `apps/server/src/ws/clientChannel.ts`:

Add a type and fields/methods to the `ClientHub` class. Add this type above the class:
```ts
export type ServiceCaller = (
  domain: string,
  service: string,
  entityId: string,
  data?: Record<string, unknown>,
) => void | Promise<void>;
```

Inside `ClientHub`, add a field and methods:
```ts
  private serviceCaller: ServiceCaller | null = null;

  setServiceCaller(caller: ServiceCaller): void {
    this.serviceCaller = caller;
  }

  handleClientMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isClientToServerMessage(parsed)) return;
    if (parsed.type === 'call_service' && this.serviceCaller) {
      void this.serviceCaller(parsed.domain, parsed.service, parsed.entityId, parsed.data);
    }
  }
```

Update the import from `@aspect/shared` in this file to also bring in `isClientToServerMessage`. Update the `/ws` route handler in `clientChannel` to listen for messages:
```ts
    app.get('/ws', { websocket: true }, (socket) => {
      hub.add(socket);
      socket.on('message', (raw) => hub.handleClientMessage(raw.toString()));
    });
```

- [ ] **Step 3: Wire the caller in `apps/server/src/start.ts`.** After `const ha = await startHaConnection({...})` and before/after the log, add:
```ts
      app.clientHub.setServiceCaller(ha.callService);
```
(Place it right after `const ha = ...`, before the `console.log`.)

- [ ] **Step 4: Make the mock record service calls.** In `apps/server/test/helpers/mockHaServer.ts`:

Add a field `private calls: Array<{ domain: string; service: string; serviceData: unknown; target: unknown }> = [];` and a getter:
```ts
  getServiceCalls(): ReadonlyArray<{ domain: string; service: string; serviceData: unknown; target: unknown }> {
    return this.calls;
  }
```
Add a `case` in `handleMessage`'s switch (before `default`):
```ts
      case 'call_service':
        this.calls.push({
          domain: msg.domain as string,
          service: msg.service as string,
          serviceData: msg.service_data,
          target: msg.target,
        });
        result(null);
        return;
```

- [ ] **Step 5: Write the failing unit test in `apps/server/test/clientChannel.test.ts`** — add a new `describe` block:

```ts
describe('ClientHub.handleClientMessage', () => {
  it('invokes the service caller for a call_service message', () => {
    const cache = new HaCache();
    const hub = new ClientHub(cache);
    const calls: Array<[string, string, string, unknown]> = [];
    hub.setServiceCaller((domain, service, entityId, data) =>
      calls.push([domain, service, entityId, data]),
    );
    hub.handleClientMessage(
      JSON.stringify({
        type: 'call_service',
        domain: 'light',
        service: 'turn_on',
        entityId: 'light.k',
        data: { brightness_pct: 40 },
      }),
    );
    expect(calls).toEqual([['light', 'turn_on', 'light.k', { brightness_pct: 40 }]]);
  });

  it('ignores invalid messages without throwing', () => {
    const hub = new ClientHub(new HaCache());
    hub.setServiceCaller(() => {
      throw new Error('should not be called');
    });
    expect(() => hub.handleClientMessage('not json')).not.toThrow();
    expect(() => hub.handleClientMessage(JSON.stringify({ type: 'x' }))).not.toThrow();
  });
});
```

Ensure the test file imports `ClientHub` and `HaCache` (the existing file already imports `buildApp`, `HaCache`, `listen`; add `ClientHub` from `../src/ws/clientChannel.js` if not already imported).

- [ ] **Step 6: Write the full-stack test `apps/server/test/controlFlow.test.ts`**

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { createCallServiceMessage } from '@aspect/shared';
import { buildApp } from '../src/app.js';
import { HaCache } from '../src/cache/haCache.js';
import { startHaConnection, type HaConnectionHandle } from '../src/ha/connection.js';
import { MockHaServer } from './helpers/mockHaServer.js';
import { listen } from './helpers/wsTestClient.js';

let app: FastifyInstance | undefined;
let mock: MockHaServer | undefined;
let handle: HaConnectionHandle | undefined;

afterEach(async () => {
  handle?.stop();
  handle = undefined;
  await mock?.stop();
  mock = undefined;
  await app?.close();
  app = undefined;
});

describe('control flow', () => {
  it('forwards a client call_service all the way to Home Assistant', async () => {
    mock = await MockHaServer.start({ token: 'secret', states: [] });
    const cache = new HaCache();
    app = await buildApp({ cache });
    const base = await listen(app);
    handle = await startHaConnection({ url: mock.url, token: 'secret', cache, hub: app.clientHub });
    app.clientHub.setServiceCaller(handle.callService);

    const socket = new WebSocket(`${base}/ws`);
    await new Promise<void>((resolve) => socket.on('open', resolve));
    socket.send(JSON.stringify(createCallServiceMessage('light', 'turn_on', 'light.k', { brightness_pct: 60 })));

    await vi.waitFor(() => {
      const calls = mock!.getServiceCalls();
      expect(calls.length).toBe(1);
      expect(calls[0]?.domain).toBe('light');
      expect(calls[0]?.service).toBe('turn_on');
      expect(calls[0]?.target).toEqual({ entity_id: 'light.k' });
      expect(calls[0]?.serviceData).toEqual({ brightness_pct: 60 });
    });
    socket.close();
  });
});
```

- [ ] **Step 7: Run server tests, typecheck, build**

Run: `pnpm --filter @aspect/server test:run && pnpm --filter @aspect/server typecheck && pnpm --filter @aspect/server build`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/server
git commit -m "feat(server): forward client call_service to Home Assistant"
```

---

## Task 3: Client command channel + optimistic store

**Files:** Modify `apps/web/src/server-client/socket.ts`, `apps/web/src/store/connectionStore.ts`, `apps/web/src/store/connectionStore.test.ts`; Create `apps/web/src/server-client/commands.ts`, `apps/web/src/server-client/commands.test.ts`

- [ ] **Step 1: Expose `sendToServer` from `apps/web/src/server-client/socket.ts`.**

Add a module-level reference and a sender. At the top, after the constants, add:
```ts
let activeSocket: WebSocket | null = null;
```
In `open()`, set `activeSocket = socket;` right after `socket = new WebSocket(target);`. In `socket.onclose`, add `if (activeSocket === socket) activeSocket = null;` before the reconnect logic. At the bottom of the file (module scope), export:
```ts
import type { ClientToServerMessage } from '@aspect/shared';

/** Sends a message to the Aspect server if the socket is open. Returns success. */
export function sendToServer(msg: ClientToServerMessage): boolean {
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    activeSocket.send(JSON.stringify(msg));
    return true;
  }
  return false;
}
```
(Place the `import type` with the other imports at the top.)

- [ ] **Step 2: Create `apps/web/src/server-client/commands.ts`**

```ts
import { createCallServiceMessage } from '@aspect/shared';
import { sendToServer } from './socket.js';

/** Sends a Home Assistant service call to the server. */
export function callService(
  domain: string,
  service: string,
  entityId: string,
  data?: Record<string, unknown>,
): void {
  sendToServer(createCallServiceMessage(domain, service, entityId, data));
}
```

- [ ] **Step 3: Add `applyOptimistic` to `apps/web/src/store/connectionStore.ts`.**

Add to the `ConnectionState` interface:
```ts
  applyOptimistic: (
    entityId: string,
    patch: { state?: string; attributes?: Record<string, unknown> },
  ) => void;
```
Add to the store implementation:
```ts
  applyOptimistic: (entityId, patch) =>
    set((s) => {
      const current = s.entities[entityId];
      if (!current) return {};
      return {
        entities: {
          ...s.entities,
          [entityId]: {
            ...current,
            ...(patch.state !== undefined ? { state: patch.state } : {}),
            attributes: { ...current.attributes, ...(patch.attributes ?? {}) },
          },
        },
      };
    }),
```

- [ ] **Step 4: Add a test to `apps/web/src/store/connectionStore.test.ts`** (new `it` inside the existing describe):

```ts
  it('applies an optimistic patch over the current entity', () => {
    useConnectionStore.getState().applySnapshot({
      entities: [entity('light.a', 'off')],
      areas: [],
      devices: [],
      registry: [],
    });
    useConnectionStore.getState().applyOptimistic('light.a', {
      state: 'on',
      attributes: { brightness: 128 },
    });
    const got = useConnectionStore.getState().entities['light.a'];
    expect(got?.state).toBe('on');
    expect(got?.attributes.brightness).toBe(128);
  });

  it('ignores optimistic patches for unknown entities', () => {
    useConnectionStore.getState().applyOptimistic('light.ghost', { state: 'on' });
    expect(useConnectionStore.getState().entities['light.ghost']).toBeUndefined();
  });
```

Also add `applyOptimistic: ... ` is covered by the store; ensure the `reset`/`setState` blocks in the test file still compile (they set the documented fields; `applyOptimistic` is a method on the store, not part of the data reset — no change needed).

- [ ] **Step 5: Write `apps/web/src/server-client/commands.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sent: unknown[] = [];
vi.mock('./socket.js', () => ({
  sendToServer: (msg: unknown) => {
    sent.push(msg);
    return true;
  },
}));

import { callService } from './commands.js';

describe('callService', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('sends a call_service message with data', () => {
    callService('light', 'turn_on', 'light.k', { brightness_pct: 50 });
    expect(sent[0]).toEqual({
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      entityId: 'light.k',
      data: { brightness_pct: 50 },
    });
  });
});
```

- [ ] **Step 6: Run web tests, typecheck**

Run: `pnpm --filter @aspect/web test:run server-client/commands && pnpm --filter @aspect/web test:run store/connectionStore && pnpm --filter @aspect/web typecheck`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server-client apps/web/src/store
git commit -m "feat(web): add bidirectional socket, command client, optimistic store"
```

---

## Task 4: Shared control building blocks + core controls (light, cover, climate, toggles)

**Files:** Create `apps/web/src/controls/ActionButton.tsx`, `ToggleControls.tsx`, `LightControls.tsx`, `CoverControls.tsx`, `ClimateControls.tsx`, `LightControls.test.tsx`

- [ ] **Step 1: `apps/web/src/controls/ActionButton.tsx`**

```tsx
import type { ReactElement, ReactNode } from 'react';

export function ActionButton({
  onClick,
  active = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        cursor: 'pointer',
        padding: '10px 16px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        font: 'inherit',
        background: active ? 'var(--active-icon)' : 'var(--surface)',
        color: active ? '#1a1205' : 'var(--text)',
        border: `1px solid ${active ? 'var(--active-border)' : 'var(--border)'}`,
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: `apps/web/src/controls/ToggleControls.tsx`** (switch, fan, lock; fan adds a % slider when `percentage` present)

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

const SERVICES: Record<string, { on: string; off: string; onState: string; offState: string }> = {
  switch: { on: 'turn_on', off: 'turn_off', onState: 'on', offState: 'off' },
  fan: { on: 'turn_on', off: 'turn_off', onState: 'on', offState: 'off' },
  lock: { on: 'unlock', off: 'lock', onState: 'unlocked', offState: 'locked' },
};

export function ToggleControls({ entity }: { entity: EntityState }): ReactElement {
  const domain = domainOf(entity.entityId);
  const cfg = SERVICES[domain] ?? SERVICES.switch!;
  const isOn = entity.state === cfg.onState;
  const optimistic = useConnectionStore((s) => s.applyOptimistic);

  const toggle = (): void => {
    const next = isOn ? cfg.off : cfg.on;
    optimistic(entity.entityId, { state: isOn ? cfg.offState : cfg.onState });
    callService(domain, next, entity.entityId);
  };

  const setPct = (pct: number): void => {
    optimistic(entity.entityId, { attributes: { percentage: pct } });
    callService('fan', 'set_percentage', entity.entityId, { percentage: pct });
  };

  const pct =
    typeof entity.attributes.percentage === 'number'
      ? (entity.attributes.percentage as number)
      : null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ActionButton onClick={toggle} active={isOn}>
        {isOn ? `Turn ${domain === 'lock' ? 'lock' : 'off'}` : `Turn ${domain === 'lock' ? 'unlock' : 'on'}`}
      </ActionButton>
      {domain === 'fan' && pct !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Speed: {pct}%
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(ev) => setPct(Number(ev.target.value))}
          />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `apps/web/src/controls/LightControls.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function LightControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const isOn = entity.state === 'on';
  const id = entity.entityId;

  const brightness = typeof entity.attributes.brightness === 'number'
    ? Math.round(((entity.attributes.brightness as number) / 255) * 100)
    : isOn ? 100 : 0;

  const modes = Array.isArray(entity.attributes.supported_color_modes)
    ? (entity.attributes.supported_color_modes as string[])
    : [];
  const supportsBrightness = modes.some((m) => m !== 'onoff') || 'brightness' in entity.attributes;
  const supportsTemp = modes.includes('color_temp');
  const minK = (entity.attributes.min_color_temp_kelvin as number) ?? 2000;
  const maxK = (entity.attributes.max_color_temp_kelvin as number) ?? 6500;
  const curK = typeof entity.attributes.color_temp_kelvin === 'number'
    ? (entity.attributes.color_temp_kelvin as number)
    : Math.round((minK + maxK) / 2);

  const toggle = (): void => {
    optimistic(id, { state: isOn ? 'off' : 'on' });
    callService('light', isOn ? 'turn_off' : 'turn_on', id);
  };
  const setBrightness = (pct: number): void => {
    optimistic(id, { state: pct > 0 ? 'on' : 'off', attributes: { brightness: Math.round((pct / 100) * 255) } });
    callService('light', 'turn_on', id, { brightness_pct: pct });
  };
  const setTemp = (k: number): void => {
    optimistic(id, { attributes: { color_temp_kelvin: k } });
    callService('light', 'turn_on', id, { color_temp_kelvin: k });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ActionButton onClick={toggle} active={isOn}>{isOn ? 'Turn off' : 'Turn on'}</ActionButton>
      {supportsBrightness && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Brightness: {brightness}%
          <input type="range" min={0} max={100} value={brightness}
            onChange={(ev) => setBrightness(Number(ev.target.value))} />
        </label>
      )}
      {supportsTemp && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Warmth: {curK}K
          <input type="range" min={minK} max={maxK} step={50} value={curK}
            onChange={(ev) => setTemp(Number(ev.target.value))} />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `apps/web/src/controls/CoverControls.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function CoverControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const position = typeof entity.attributes.current_position === 'number'
    ? (entity.attributes.current_position as number)
    : null;

  const act = (service: string, state: string): void => {
    optimistic(id, { state });
    callService('cover', service, id);
  };
  const setPosition = (pos: number): void => {
    optimistic(id, { attributes: { current_position: pos }, state: pos > 0 ? 'open' : 'closed' });
    callService('cover', 'set_cover_position', id, { position: pos });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => act('open_cover', 'open')}>Open</ActionButton>
        <ActionButton onClick={() => act('stop_cover', entity.state)}>Stop</ActionButton>
        <ActionButton onClick={() => act('close_cover', 'closed')}>Close</ActionButton>
      </div>
      {position !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Position: {position}%
          <input type="range" min={0} max={100} value={position}
            onChange={(ev) => setPosition(Number(ev.target.value))} />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `apps/web/src/controls/ClimateControls.tsx`** (climate state is the hvac mode)

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function ClimateControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const target = typeof entity.attributes.temperature === 'number'
    ? (entity.attributes.temperature as number)
    : null;
  const step = typeof entity.attributes.target_temp_step === 'number'
    ? (entity.attributes.target_temp_step as number)
    : 0.5;
  const current = entity.attributes.current_temperature;
  const modes = Array.isArray(entity.attributes.hvac_modes)
    ? (entity.attributes.hvac_modes as string[])
    : [];

  const setTemp = (t: number): void => {
    optimistic(id, { attributes: { temperature: t } });
    callService('climate', 'set_temperature', id, { temperature: t });
  };
  const setMode = (mode: string): void => {
    optimistic(id, { state: mode });
    callService('climate', 'set_hvac_mode', id, { hvac_mode: mode });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {typeof current === 'number' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Current: {current}°</p>
      )}
      {target !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActionButton onClick={() => setTemp(Number((target - step).toFixed(1)))}>−</ActionButton>
          <span style={{ fontSize: 22, fontWeight: 650, minWidth: 64, textAlign: 'center' }}>{target}°</span>
          <ActionButton onClick={() => setTemp(Number((target + step).toFixed(1)))}>+</ActionButton>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {modes.map((mode) => (
          <ActionButton key={mode} active={entity.state === mode} onClick={() => setMode(mode)}>
            {mode.replace(/_/g, ' ')}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `apps/web/src/controls/LightControls.test.tsx`** (representative control test)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LightControls } from './LightControls.js';
import type { EntityState } from '@aspect/shared';

const sent: unknown[] = [];
vi.mock('../server-client/commands.js', () => ({
  callService: (...args: unknown[]) => sent.push(args),
}));

const light = (state: string, attributes: Record<string, unknown> = {}): EntityState => ({
  entityId: 'light.kitchen',
  state,
  attributes,
  lastChanged: 't',
  lastUpdated: 't',
});

describe('LightControls', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('turns a light on when off', async () => {
    render(<LightControls entity={light('off')} />);
    await userEvent.click(screen.getByRole('button', { name: /turn on/i }));
    expect(sent[0]).toEqual(['light', 'turn_on', 'light.kitchen']);
  });

  it('shows a brightness slider when supported', () => {
    render(<LightControls entity={light('on', { brightness: 128, supported_color_modes: ['brightness'] })} />);
    expect(screen.getByText(/brightness/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run controls/LightControls && pnpm --filter @aspect/web typecheck`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/controls
git commit -m "feat(web): add light, cover, climate, and toggle controls"
```

---

## Task 5: Quick actions + helper controls

**Files:** Create `apps/web/src/controls/QuickAction.tsx`, `apps/web/src/controls/HelperControls.tsx`

- [ ] **Step 1: `apps/web/src/controls/QuickAction.tsx`** (scene, script, automation, button)

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function QuickAction({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const domain = domainOf(entity.entityId);
  const id = entity.entityId;

  if (domain === 'automation') {
    const isOn = entity.state === 'on';
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => callService('automation', 'trigger', id)}>Run now</ActionButton>
        <ActionButton active={isOn} onClick={() => {
          optimistic(id, { state: isOn ? 'off' : 'on' });
          callService('automation', isOn ? 'turn_off' : 'turn_on', id);
        }}>
          {isOn ? 'Enabled' : 'Disabled'}
        </ActionButton>
      </div>
    );
  }

  const label = domain === 'scene' ? 'Activate' : domain === 'button' ? 'Press' : 'Run';
  const service = domain === 'button' ? 'press' : 'turn_on';
  return <ActionButton onClick={() => callService(domain, service, id)}>{label}</ActionButton>;
}
```

- [ ] **Step 2: `apps/web/src/controls/HelperControls.tsx`** (select, number)

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';

export function HelperControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const domain = domainOf(entity.entityId);
  const id = entity.entityId;

  if (domain === 'select') {
    const options = Array.isArray(entity.attributes.options)
      ? (entity.attributes.options as string[])
      : [];
    return (
      <select
        value={entity.state}
        onChange={(ev) => {
          optimistic(id, { state: ev.target.value });
          callService('select', 'select_option', id, { option: ev.target.value });
        }}
        style={{ padding: 10, borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', font: 'inherit' }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  // number
  const min = (entity.attributes.min as number) ?? 0;
  const max = (entity.attributes.max as number) ?? 100;
  const step = (entity.attributes.step as number) ?? 1;
  const value = Number(entity.state);
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
      Value: {entity.state}
      <input type="range" min={min} max={max} step={step} value={Number.isNaN(value) ? min : value}
        onChange={(ev) => {
          optimistic(id, { state: ev.target.value });
          callService('number', 'set_value', id, { value: Number(ev.target.value) });
        }} />
    </label>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @aspect/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/controls/QuickAction.tsx apps/web/src/controls/HelperControls.tsx
git commit -m "feat(web): add quick-action and helper controls"
```

---

## Task 6: Media player controls

**Files:** Create `apps/web/src/controls/MediaPlayerControls.tsx`

- [ ] **Step 1: `apps/web/src/controls/MediaPlayerControls.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function MediaPlayerControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const title = typeof entity.attributes.media_title === 'string'
    ? (entity.attributes.media_title as string)
    : null;
  const volume = typeof entity.attributes.volume_level === 'number'
    ? Math.round((entity.attributes.volume_level as number) * 100)
    : null;
  const sources = Array.isArray(entity.attributes.source_list)
    ? (entity.attributes.source_list as string[])
    : [];
  const isPlaying = entity.state === 'playing';

  const cmd = (service: string): void => callService('media_player', service, id);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {title && <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => cmd('media_previous_track')}>⏮</ActionButton>
        <ActionButton active={isPlaying} onClick={() => {
          optimistic(id, { state: isPlaying ? 'paused' : 'playing' });
          cmd('media_play_pause');
        }}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </ActionButton>
        <ActionButton onClick={() => cmd('media_next_track')}>⏭</ActionButton>
      </div>
      {volume !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Volume: {volume}%
          <input type="range" min={0} max={100} value={volume}
            onChange={(ev) => {
              const v = Number(ev.target.value);
              optimistic(id, { attributes: { volume_level: v / 100 } });
              callService('media_player', 'volume_set', id, { volume_level: v / 100 });
            }} />
        </label>
      )}
      {sources.length > 0 && (
        <select
          value={typeof entity.attributes.source === 'string' ? (entity.attributes.source as string) : ''}
          onChange={(ev) => callService('media_player', 'select_source', id, { source: ev.target.value })}
          style={{ padding: 10, borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', font: 'inherit' }}
        >
          <option value="" disabled>Choose source…</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aspect/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/controls/MediaPlayerControls.tsx
git commit -m "feat(web): add media player controls"
```

---

## Task 7: Controls dispatcher + wire into the detail sheet

**Files:** Create `apps/web/src/controls/ControlsFor.tsx`, `apps/web/src/controls/ControlsFor.test.tsx`; Modify `apps/web/src/dashboard/EntityDetailSheet.tsx`

- [ ] **Step 1: `apps/web/src/controls/ControlsFor.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { LightControls } from './LightControls.js';
import { CoverControls } from './CoverControls.js';
import { ClimateControls } from './ClimateControls.js';
import { ToggleControls } from './ToggleControls.js';
import { QuickAction } from './QuickAction.js';
import { HelperControls } from './HelperControls.js';
import { MediaPlayerControls } from './MediaPlayerControls.js';

/** Renders the right control set for an entity's domain, or null if read-only. */
export function ControlsFor({ entity }: { entity: EntityState }): ReactElement | null {
  switch (domainOf(entity.entityId)) {
    case 'light':
      return <LightControls entity={entity} />;
    case 'cover':
      return <CoverControls entity={entity} />;
    case 'climate':
      return <ClimateControls entity={entity} />;
    case 'switch':
    case 'fan':
    case 'lock':
      return <ToggleControls entity={entity} />;
    case 'scene':
    case 'script':
    case 'automation':
    case 'button':
      return <QuickAction entity={entity} />;
    case 'select':
    case 'number':
      return <HelperControls entity={entity} />;
    case 'media_player':
      return <MediaPlayerControls entity={entity} />;
    default:
      return null;
  }
}
```

- [ ] **Step 2: `apps/web/src/controls/ControlsFor.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ControlsFor } from './ControlsFor.js';
import type { EntityState } from '@aspect/shared';

vi.mock('../server-client/commands.js', () => ({ callService: vi.fn() }));

const e = (entityId: string, state = 'off', attributes: Record<string, unknown> = {}): EntityState => ({
  entityId, state, attributes, lastChanged: 't', lastUpdated: 't',
});

describe('ControlsFor', () => {
  it('renders light controls for a light', () => {
    render(<ControlsFor entity={e('light.k', 'off')} />);
    expect(screen.getByRole('button', { name: /turn on/i })).toBeInTheDocument();
  });

  it('renders an Activate button for a scene', () => {
    render(<ControlsFor entity={e('scene.movie')} />);
    expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
  });

  it('returns null for a read-only sensor', () => {
    const { container } = render(<ControlsFor entity={e('sensor.temp', '21')} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Wire into `apps/web/src/dashboard/EntityDetailSheet.tsx`.** Replace the "Controls are coming soon." paragraph with `<ControlsFor entity={entity} />`. Add the import:
```tsx
import { ControlsFor } from '../controls/ControlsFor.js';
```
The body becomes (keep formatState line + AttributeList):
```tsx
      {entity && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>
            {formatState(entity)}
          </p>
          <ControlsFor entity={entity} />
          <AttributeList entity={entity} />
        </div>
      )}
```

- [ ] **Step 4: Update the Dashboard test expectation.** In `apps/web/src/dashboard/Dashboard.test.tsx`, the test "opens the detail sheet when a tile is tapped" asserts `/controls are coming soon/i`. Change that assertion to check the sheet opened another way — assert the entity name appears as the sheet heading. Replace:
```tsx
    expect(await screen.findByText(/controls are coming soon/i)).toBeInTheDocument();
```
with:
```tsx
    // The sheet opens with the entity name as its heading (role=dialog).
    expect(await screen.findByRole('dialog', { name: /kitchen lamp/i })).toBeInTheDocument();
```
(If `commands.js`'s `callService` is invoked indirectly through rendering a light's controls, it is a no-op send — no socket in jsdom — so no mock is required; but if the test throws due to the socket import, add `vi.mock('../server-client/commands.js', () => ({ callService: () => {} }));` at the top of Dashboard.test.tsx.)

- [ ] **Step 5: Run the full web suite, typecheck, build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/controls apps/web/src/dashboard/EntityDetailSheet.tsx apps/web/src/dashboard/Dashboard.test.tsx
git commit -m "feat(web): dispatch per-domain controls in the detail sheet"
```

---

## Task 8: Full verification

**Files:** none committed

- [ ] **Step 1: Whole workspace (what CI runs)**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass.

- [ ] **Step 2: Manual test against real HA** (recommended)

```
pnpm build
$env:HA_URL="http://<your-ha>:8123"; $env:HA_TOKEN="<token>"; $env:ASPECT_WEB_DIR="apps/web/dist"; node apps/server/dist/server.js
```
Open `http://127.0.0.1:8099`, tap a light tile → toggle it / drag brightness; tap a scene → Activate; tap a media player → play/pause/volume. Changes should take effect in Home Assistant and reflect back on the tiles within a moment.

- [ ] **Step 3: Confirm clean tree**

Run: `git status --short`
Expected: empty.

- [ ] **Step 4: No commit** (verification only).

---

## Definition of Done

- [ ] `pnpm typecheck`, `pnpm test:run`, `pnpm build` all pass.
- [ ] A client `call_service` travels browser → Aspect server → Home Assistant (proven by `controlFlow.test.ts` against the mock).
- [ ] The detail sheet shows working controls for light (toggle/brightness/color-temp), switch, cover (open/close/stop/position), climate (temp/mode), scene/script/automation/button, select/number, and media_player; read-only domains show no controls.
- [ ] Optimistic updates give instant feedback and are reconciled by the authoritative `entity_update`.

## Notes for the Next Plan (Plan 5 — Persistence, Favorites & Edit Mode)

- The control channel is the template for any future client→server command; `ClientToServerMessage` is the extension point.
- Tiles still open the sheet to control; a tap-to-toggle quick action on the tile itself (for light/switch) is a nice follow-up once favorites/edit exist.
- Optimistic patches are coarse (state/attributes merge). If flicker appears when a slider is dragged rapidly, Plan 5+ can add a short "pending" suppression window before accepting authoritative updates for just-touched entities.
