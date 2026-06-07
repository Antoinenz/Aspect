# Aspect — UI Overhaul Plan 3: App Shell + Room Tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Apple/Frost redesign *visible*: replace the single scrolling dashboard with the tabbed shell (Summary · Quick · each room), apply "balanced" filtering and battery-on-device to the room views, restyle the room tiles with the new primitives (wide tiles for climate/media), add a "Device info" section to the detail sheet, and swap the controls' raw range inputs for the tactile `Slider`. Summary and Quick Access are placeholder panels here (built in Plans 4–5).

**Architecture:** Extend the pure `rooms.ts` to filter noise (using `entityCategory`/`hidden`/`disabled` + noise domains) and compute per-device battery on each device's primary tile. A new `AppShell` drives the Radix `Tabs` (Summary/Quick placeholders + one panel per room). `RoomTab` renders a room's tiles (battery + wide variants). `EntityDetailSheet` gains a "Device info" section computed from sibling entities in the store. Controls adopt the `Slider` primitive.

**Tech Stack:** unchanged (uses the Plan 2 primitives: `Tabs`/`TabPanel`, `Tile`, `Sheet`, `Slider`, `Icon`, `iconFor`/`tintFor`).

**Prerequisite:** UI Plans 1 & 2 merged. Local pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if needed.

---

## File Structure

```
apps/web/src/
  dashboard/rooms.ts            MOD  filtering + battery + wide; RoomEntity gains battery/wide
  dashboard/rooms.test.ts       MOD
  dashboard/RoomTab.tsx         NEW  one room's header + tile grid (renamed/expanded RoomSection)
  dashboard/RoomSection.tsx     DEL  (superseded by RoomTab)
  dashboard/AppShell.tsx        NEW  Tabs: Summary/Quick placeholders + room panels
  dashboard/AppShell.test.tsx   NEW
  dashboard/SummaryTab.tsx      NEW  placeholder ("Coming soon")
  dashboard/QuickAccessTab.tsx  NEW  placeholder ("Coming soon")
  dashboard/EntityDetailSheet.tsx MOD  + Device info section (sibling entities)
  dashboard/deviceInfo.ts       NEW  pure: siblingReadings(entityId, store data)
  dashboard/deviceInfo.test.ts  NEW
  dashboard/roomIcon.ts         NEW  area name -> MDI tab icon
  App.tsx                       MOD  render AppShell (keep connection badge)
  App.test.tsx                  MOD
  controls/LightControls.tsx    MOD  brightness/temp via Slider
  controls/CoverControls.tsx    MOD  position via Slider
  controls/MediaPlayerControls.tsx MOD  volume via Slider
  controls/HelperControls.tsx   MOD  number via Slider
```

---

## Task 1: Room filtering, battery, and wide tiles (pure)

**Files:** Modify `apps/web/src/dashboard/rooms.ts`, `apps/web/src/dashboard/rooms.test.ts`

- [ ] **Step 1: Replace `apps/web/src/dashboard/rooms.test.ts`** with coverage for filtering + battery + wide:

```ts
import { describe, it, expect } from 'vitest';
import { buildRooms } from './rooms.js';
import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';

const e = (entityId: string, state = 'on', attributes: Record<string, unknown> = {}): EntityState => ({
  entityId, state, attributes, lastChanged: 't', lastUpdated: 't',
});
const reg = (
  entityId: string,
  opts: Partial<RegistryEntry> = {},
): RegistryEntry => ({
  entityId, areaId: null, deviceId: null, name: null, platform: 'demo',
  entityCategory: null, hidden: false, disabled: false, deviceClass: null, ...opts,
});

describe('buildRooms filtering', () => {
  it('hides diagnostic/config, hidden, disabled, and noise-domain entities', () => {
    const entities = {
      'light.a': e('light.a'),
      'sensor.cfg': e('sensor.cfg', '1'),
      'sensor.diag': e('sensor.diag', '1'),
      'sensor.hidden': e('sensor.hidden', '1'),
      'update.fw': e('update.fw', 'off'),
      'sensor.temp': e('sensor.temp', '21', { device_class: 'temperature' }),
    };
    const registry = [
      reg('light.a', { areaId: 'k' }),
      reg('sensor.cfg', { areaId: 'k', entityCategory: 'config' }),
      reg('sensor.diag', { areaId: 'k', entityCategory: 'diagnostic' }),
      reg('sensor.hidden', { areaId: 'k', hidden: true }),
      reg('sensor.temp', { areaId: 'k' }),
    ];
    const rooms = buildRooms(entities, [{ areaId: 'k', name: 'Kitchen' }], [], registry);
    const ids = rooms[0]!.entities.map((r) => r.entity.entityId).sort();
    expect(ids).toEqual(['light.a', 'sensor.temp']); // cfg/diag/hidden/update dropped
  });

  it('marks climate and media_player tiles as wide', () => {
    const entities = { 'climate.h': e('climate.h', 'heat'), 'media_player.tv': e('media_player.tv', 'playing') };
    const rooms = buildRooms(entities, [], [], []);
    const byId = Object.fromEntries(rooms[0]!.entities.map((r) => [r.entity.entityId, r]));
    expect(byId['climate.h']!.wide).toBe(true);
    expect(byId['media_player.tv']!.wide).toBe(true);
  });
});

describe('buildRooms battery', () => {
  it('attaches a device battery to that device primary tile, not the battery sensor itself', () => {
    const entities = {
      'light.a': e('light.a'),
      'sensor.a_batt': e('sensor.a_batt', '42', { device_class: 'battery' }),
    };
    const devices: Device[] = [{ deviceId: 'd1', name: 'Lamp', areaId: 'k' }];
    const registry = [
      reg('light.a', { deviceId: 'd1', areaId: 'k' }),
      reg('sensor.a_batt', { deviceId: 'd1', areaId: 'k', entityCategory: 'diagnostic', deviceClass: 'battery' }),
    ];
    const rooms = buildRooms(entities, [{ areaId: 'k', name: 'Kitchen' }], devices, registry);
    const tiles = rooms[0]!.entities;
    expect(tiles.map((t) => t.entity.entityId)).toEqual(['light.a']); // battery sensor not a tile
    expect(tiles[0]!.battery).toBe(42);
  });

  it('leaves battery null when the device has none', () => {
    const entities = { 'light.a': e('light.a') };
    const rooms = buildRooms(entities, [], [], [reg('light.a')]);
    expect(rooms[0]!.entities[0]!.battery).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run dashboard/rooms`
Expected: FAIL — new fields/behavior missing.

- [ ] **Step 3: Replace `apps/web/src/dashboard/rooms.ts`**

```ts
import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';
import { domainOf, friendlyName, isSupported } from '../domain/entities.js';

export interface RoomEntity {
  entity: EntityState;
  name: string;
  domain: string;
  /** Battery % for this entity's device, shown only on the device's primary tile. */
  battery: number | null;
  /** Render as a 2-column wide tile (climate, media). */
  wide: boolean;
}

export interface Room {
  areaId: string;
  name: string;
  entities: RoomEntity[];
}

const UNASSIGNED = '__unassigned__';
const WIDE_DOMAINS = new Set(['climate', 'media_player']);
const NOISE_DOMAINS = new Set([
  'update', 'event', 'conversation', 'tts', 'stt', 'sun', 'zone',
  'persistent_notification', 'device_tracker', 'person', 'image',
]);

/** Priority for choosing a device's primary (battery-bearing) tile. */
const PRIORITY: Record<string, number> = {
  light: 0, climate: 1, cover: 2, lock: 3, fan: 4, switch: 5, media_player: 6,
};
const priorityOf = (id: string): number => PRIORITY[domainOf(id)] ?? 50;

function isVisible(entity: EntityState, reg: RegistryEntry | undefined): boolean {
  if (reg?.hidden || reg?.disabled) return false;
  if (reg?.entityCategory === 'diagnostic' || reg?.entityCategory === 'config') return false;
  const domain = domainOf(entity.entityId);
  if (NOISE_DOMAINS.has(domain)) return false;
  return isSupported(entity.entityId) || domain === 'media_player';
}

function batteryOf(entity: EntityState): number | null {
  if (entity.attributes.device_class !== 'battery') return null;
  const n = Number(entity.state);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function buildRooms(
  entities: Record<string, EntityState>,
  areas: Area[],
  devices: Device[],
  registry: RegistryEntry[],
): Room[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceById = new Map(devices.map((d) => [d.deviceId, d]));
  const areaName = new Map(areas.map((a) => [a.areaId, a.name]));
  const all = Object.values(entities);

  // Per-device battery (from any battery entity belonging to the device).
  const deviceBattery = new Map<string, number>();
  for (const entity of all) {
    const reg = regByEntity.get(entity.entityId);
    const batt = batteryOf(entity);
    if (reg?.deviceId && batt !== null) deviceBattery.set(reg.deviceId, batt);
  }

  // Visible tiles, with their resolved area + device.
  interface Pending { entity: EntityState; areaId: string; deviceId: string | null; reg: RegistryEntry | undefined; }
  const pending: Pending[] = [];
  for (const entity of all) {
    const reg = regByEntity.get(entity.entityId);
    if (!isVisible(entity, reg)) continue;
    const deviceArea = reg?.deviceId ? (deviceById.get(reg.deviceId)?.areaId ?? null) : null;
    const areaId = reg?.areaId ?? deviceArea ?? UNASSIGNED;
    pending.push({ entity, areaId, deviceId: reg?.deviceId ?? null, reg });
  }

  // The primary (highest-priority) visible entity per device carries the battery.
  const primaryByDevice = new Map<string, string>();
  for (const p of pending) {
    if (!p.deviceId) continue;
    const cur = primaryByDevice.get(p.deviceId);
    if (cur === undefined || priorityOf(p.entity.entityId) < priorityOf(cur)) {
      primaryByDevice.set(p.deviceId, p.entity.entityId);
    }
  }

  const byArea = new Map<string, RoomEntity[]>();
  for (const p of pending) {
    const domain = domainOf(p.entity.entityId);
    const isPrimary = p.deviceId !== null && primaryByDevice.get(p.deviceId) === p.entity.entityId;
    const battery = isPrimary && p.deviceId ? (deviceBattery.get(p.deviceId) ?? null) : null;
    const re: RoomEntity = {
      entity: p.entity,
      name: friendlyName(p.entity, p.reg?.name ?? null),
      domain,
      battery,
      wide: WIDE_DOMAINS.has(domain),
    };
    const list = byArea.get(p.areaId);
    if (list) list.push(re); else byArea.set(p.areaId, [re]);
  }

  const byName = (a: RoomEntity, b: RoomEntity): number => a.name.localeCompare(b.name);
  const rooms: Room[] = [];
  for (const [areaId, list] of byArea) {
    if (areaId === UNASSIGNED) continue;
    rooms.push({ areaId, name: areaName.get(areaId) ?? areaId, entities: list.sort(byName) });
  }
  rooms.sort((a, b) => a.name.localeCompare(b.name));
  const other = byArea.get(UNASSIGNED);
  if (other && other.length) rooms.push({ areaId: UNASSIGNED, name: 'Other', entities: other.sort(byName) });
  return rooms;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run dashboard/rooms`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/dashboard/rooms.ts apps/web/src/dashboard/rooms.test.ts
git commit -m "feat(web): filter noise + attach device battery in room model"
```

---

## Task 2: Device-info helper (pure)

**Files:** Create `apps/web/src/dashboard/deviceInfo.ts`, `apps/web/src/dashboard/deviceInfo.test.ts`

- [ ] **Step 1: Write `apps/web/src/dashboard/deviceInfo.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { siblingReadings } from './deviceInfo.js';
import type { EntityState, RegistryEntry } from '@aspect/shared';

const e = (id: string, state: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state, attributes: attrs, lastChanged: 't', lastUpdated: 't',
});
const reg = (entityId: string, deviceId: string | null): RegistryEntry => ({
  entityId, deviceId, areaId: null, name: null, platform: 'demo',
  entityCategory: null, hidden: false, disabled: false, deviceClass: null,
});

describe('siblingReadings', () => {
  it('returns other entities on the same device, excluding the entity itself', () => {
    const entities = {
      'light.a': e('light.a', 'on'),
      'sensor.a_batt': e('sensor.a_batt', '42', { device_class: 'battery' }),
      'sensor.a_sig': e('sensor.a_sig', '-60', { device_class: 'signal_strength' }),
      'light.other': e('light.other', 'off'),
    };
    const registry = [reg('light.a', 'd1'), reg('sensor.a_batt', 'd1'), reg('sensor.a_sig', 'd1'), reg('light.other', 'd2')];
    const out = siblingReadings('light.a', entities, registry).map((x) => x.entityId).sort();
    expect(out).toEqual(['sensor.a_batt', 'sensor.a_sig']);
  });

  it('returns [] when the entity has no device', () => {
    const entities = { 'light.a': e('light.a', 'on') };
    expect(siblingReadings('light.a', entities, [reg('light.a', null)])).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement `apps/web/src/dashboard/deviceInfo.ts`**

```ts
import type { EntityState, RegistryEntry } from '@aspect/shared';

/**
 * Other entities that belong to the same device as `entityId` (its diagnostic /
 * secondary readings), excluding the entity itself. Pure.
 */
export function siblingReadings(
  entityId: string,
  entities: Record<string, EntityState>,
  registry: RegistryEntry[],
): EntityState[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceId = regByEntity.get(entityId)?.deviceId ?? null;
  if (!deviceId) return [];
  const out: EntityState[] = [];
  for (const entity of Object.values(entities)) {
    if (entity.entityId === entityId) continue;
    if (regByEntity.get(entity.entityId)?.deviceId === deviceId) out.push(entity);
  }
  return out;
}
```

- [ ] **Step 3: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run dashboard/deviceInfo && pnpm --filter @aspect/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/dashboard/deviceInfo.ts apps/web/src/dashboard/deviceInfo.test.ts
git commit -m "feat(web): add pure siblingReadings (device info) helper"
```

---

## Task 3: Room tab + room icon

**Files:** Create `apps/web/src/dashboard/RoomTab.tsx`, `apps/web/src/dashboard/roomIcon.ts`; Delete `apps/web/src/dashboard/RoomSection.tsx`

- [ ] **Step 1: Create `apps/web/src/dashboard/roomIcon.ts`**

```ts
import {
  mdiSofaOutline, mdiFridgeOutline, mdiBedOutline, mdiDesk, mdiShower,
  mdiGarage, mdiStairs, mdiTree, mdiDoorOpen, mdiHomeOutline,
} from '@mdi/js';

const ROOM_ICONS: { match: RegExp; path: string }[] = [
  { match: /living|lounge|sofa|tv/i, path: mdiSofaOutline },
  { match: /kitchen|dining/i, path: mdiFridgeOutline },
  { match: /bed|master/i, path: mdiBedOutline },
  { match: /office|study|desk/i, path: mdiDesk },
  { match: /bath|shower|toilet|wc/i, path: mdiShower },
  { match: /garage/i, path: mdiGarage },
  { match: /hall|stair|landing/i, path: mdiStairs },
  { match: /garden|yard|outdoor|patio/i, path: mdiTree },
  { match: /entr|porch|door/i, path: mdiDoorOpen },
];

/** Best-guess MDI icon for a room/area name. */
export function roomIcon(name: string): string {
  for (const { match, path } of ROOM_ICONS) if (match.test(name)) return path;
  return mdiHomeOutline;
}
```

- [ ] **Step 2: Create `apps/web/src/dashboard/RoomTab.tsx`** (replaces RoomSection)

```tsx
import type { ReactElement } from 'react';
import { Tile } from '../ui/Tile.js';
import { formatState, isActive, domainOf } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import type { Room, RoomEntity } from './rooms.js';

export interface RoomTabProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomTab({ room, onSelect }: RoomTabProps): ReactElement {
  return (
    <div>
      <header className="mb-5">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{room.name}</h1>
        <p className="mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
          {room.entities.length} accessories · {room.entities.filter((r) => isActive(r.entity)).length} active
        </p>
      </header>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            path={iconFor(re.entity)}
            tint={tintFor(domainOf(re.entity.entityId))}
            name={re.name}
            state={formatState(re.entity)}
            active={isActive(re.entity)}
            wide={re.wide}
            battery={re.battery}
            onPress={() => onSelect(re)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete the old section**

```bash
git rm apps/web/src/dashboard/RoomSection.tsx
```

- [ ] **Step 4: Typecheck (expect a temporary break in Dashboard.tsx — fixed in Task 4)**

Run: `pnpm --filter @aspect/web typecheck`
Expected: errors only in `Dashboard.tsx` (imports the deleted `RoomSection`). That's resolved in Task 4 where `Dashboard` is replaced by `AppShell`. If you prefer, do Task 4 before running this. Do NOT commit yet.

- [ ] **Step 5: (commit happens after Task 4 wires everything; skip for now)**

---

## Task 4: App shell with tabs

**Files:** Create `apps/web/src/dashboard/AppShell.tsx`, `apps/web/src/dashboard/AppShell.test.tsx`, `apps/web/src/dashboard/SummaryTab.tsx`, `apps/web/src/dashboard/QuickAccessTab.tsx`; Delete `apps/web/src/dashboard/Dashboard.tsx` + `Dashboard.test.tsx`; Modify `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`

- [ ] **Step 1: Create placeholders.**

`apps/web/src/dashboard/SummaryTab.tsx`:
```tsx
import type { ReactElement } from 'react';
export function SummaryTab(): ReactElement {
  return <p className="text-[15px] text-[var(--color-muted)]">Summary is coming soon.</p>;
}
```
`apps/web/src/dashboard/QuickAccessTab.tsx`:
```tsx
import type { ReactElement } from 'react';
export function QuickAccessTab(): ReactElement {
  return <p className="text-[15px] text-[var(--color-muted)]">Pin devices to see them here. Quick Access is coming soon.</p>;
}
```

- [ ] **Step 2: Create `apps/web/src/dashboard/AppShell.tsx`**

```tsx
import { useMemo, useState, useCallback, type ReactElement } from 'react';
import { mdiViewDashboardOutline, mdiStarOutline } from '@mdi/js';
import { useConnectionStore } from '../store/connectionStore.js';
import { Tabs, TabPanel, type TabItem } from '../ui/Tabs.js';
import { buildRooms } from './rooms.js';
import { roomIcon } from './roomIcon.js';
import { RoomTab } from './RoomTab.js';
import { SummaryTab } from './SummaryTab.js';
import { QuickAccessTab } from './QuickAccessTab.js';
import { EntityDetailSheet } from './EntityDetailSheet.js';

export function AppShell(): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const areas = useConnectionStore((s) => s.areas);
  const devices = useConnectionStore((s) => s.devices);
  const registry = useConnectionStore((s) => s.registry);

  const rooms = useMemo(
    () => buildRooms(entities, areas, devices, registry),
    [entities, areas, devices, registry],
  );

  const tabs: TabItem[] = useMemo(
    () => [
      { id: '__summary__', label: 'Summary', path: mdiViewDashboardOutline },
      { id: '__quick__', label: 'Quick', path: mdiStarOutline },
      ...rooms.map((r) => ({ id: r.areaId, label: r.name, path: roomIcon(r.name) })),
    ],
    [rooms],
  );

  const [tab, setTab] = useState('__summary__');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setSelectedId(null), []);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[1100px] px-5 pb-10 pt-[calc(24px+env(safe-area-inset-top))]">
      <Tabs items={tabs} value={tab} onValueChange={setTab}>
        <TabPanel value="__summary__"><SummaryTab /></TabPanel>
        <TabPanel value="__quick__"><QuickAccessTab /></TabPanel>
        {rooms.map((room) => (
          <TabPanel key={room.areaId} value={room.areaId}>
            <RoomTab room={room} onSelect={(re) => setSelectedId(re.entity.entityId)} />
          </TabPanel>
        ))}
      </Tabs>
      <EntityDetailSheet entityId={selectedId} onClose={closeSheet} />
    </main>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/dashboard/AppShell.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = { link: 'connected' as const, serverStatus: 'online' as const, haConnected: true, entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[], registry: [] as never[], favorites: [] as string[] };

describe('AppShell', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows Summary and Quick tabs plus a room tab', () => {
    act(() => useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
      areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
      registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
    }));
    render(<AppShell />);
    expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /kitchen/i })).toBeInTheDocument();
  });

  it('switches to a room tab and opens a tile sheet', async () => {
    act(() => useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
      areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
      registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
    }));
    render(<AppShell />);
    await userEvent.click(screen.getByRole('tab', { name: /kitchen/i }));
    await userEvent.click(screen.getByRole('button', { name: /kitchen lamp/i }));
    expect(await screen.findByRole('dialog', { name: /kitchen lamp/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Replace `apps/web/src/App.tsx`** to render `AppShell` (keep the connection badge). Change the import and the rendered component:
```tsx
import { AppShell } from './dashboard/AppShell.js';
// ...inside the returned fragment, replace <Dashboard /> with <AppShell />
```
(Everything else in `App.tsx` — the badge logic — stays.)

- [ ] **Step 5: Replace `apps/web/src/App.test.tsx`**'s "always renders the dashboard shell (Home header)" test, which referenced the old Dashboard's "Home" header. Change that test to assert the Summary tab is present:
```tsx
  it('always renders the tab shell (Summary tab)', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
  });
```
Also add `favorites: []` to the `base` object in `App.test.tsx` if not already present.

- [ ] **Step 6: Delete the old dashboard**

```bash
git rm apps/web/src/dashboard/Dashboard.tsx apps/web/src/dashboard/Dashboard.test.tsx
```

- [ ] **Step 7: Run the full web suite, typecheck, build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all pass (AppShell, RoomTab, rooms, deviceInfo, App, controls, ui all green).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/dashboard apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): tabbed app shell with room tabs (Summary/Quick placeholders)"
```

---

## Task 5: Device info in the detail sheet + Slider controls

**Files:** Modify `apps/web/src/dashboard/EntityDetailSheet.tsx`, `apps/web/src/controls/LightControls.tsx`, `apps/web/src/controls/CoverControls.tsx`, `apps/web/src/controls/MediaPlayerControls.tsx`, `apps/web/src/controls/HelperControls.tsx`

- [ ] **Step 1: Add a "Device info" section to `apps/web/src/dashboard/EntityDetailSheet.tsx`.** It currently looks up the live entity by `entityId`. Add sibling readings from the store and render them below the controls. Replace the component body to add:

```tsx
import { siblingReadings } from './deviceInfo.js';
import { formatState, friendlyName, domainOf } from '../domain/entities.js';
// inside the component, after computing `entity`:
  const entities = useConnectionStore((s) => s.entities);
  const registry = useConnectionStore((s) => s.registry);
  const siblings = entityId ? siblingReadings(entityId, entities, registry) : [];
```
Then, inside the rendered sheet (after `<ControlsFor entity={entity} />` and before/replacing the raw `AttributeList`), add:
```tsx
          {siblings.length > 0 && (
            <div className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Device info</span>
              {siblings.map((s) => (
                <div key={s.entityId} className="flex justify-between gap-3 text-[13px]">
                  <span className="text-[var(--color-muted)]">{friendlyName(s, null)}</span>
                  <span className="text-right">{formatState(s)}</span>
                </div>
              ))}
            </div>
          )}
```
Keep the existing `AttributeList` if present, or remove it in favor of Device info (your choice — prefer Device info; you may drop the raw `AttributeList` and its helper to reduce noise). Ensure `domainOf` import is only added if used; remove unused imports to satisfy `noUnusedLocals`.

- [ ] **Step 2: Swap raw range inputs for `Slider`.** In each control, replace `<input type="range" ... />` with the `Slider` primitive (`import { Slider } from '../ui/Slider.js';`), wiring `onCommit` to the existing service call and removing the optimistic-on-change if it caused jitter (keep optimistic on commit).

`LightControls.tsx` — brightness:
```tsx
<Slider ariaLabel="Brightness" value={brightness} min={0} max={100}
  onCommit={(v) => setBrightness(v)} />
```
and warmth:
```tsx
<Slider ariaLabel="Warmth" value={curK} min={minK} max={maxK} step={50}
  onCommit={(v) => setTemp(v)} />
```
Keep the surrounding labels (`Brightness: {brightness}%`, `Warmth: {curK}K`).

`CoverControls.tsx` — position:
```tsx
<Slider ariaLabel="Position" value={position} min={0} max={100} onCommit={(v) => setPosition(v)} />
```

`MediaPlayerControls.tsx` — volume:
```tsx
<Slider ariaLabel="Volume" value={volume} min={0} max={100} onCommit={(v) => {
  optimistic(id, { attributes: { volume_level: v / 100 } });
  callService('media_player', 'volume_set', id, { volume_level: v / 100 });
}} />
```

`HelperControls.tsx` — number:
```tsx
<Slider ariaLabel="Value" value={Number.isNaN(value) ? min : value} min={min} max={max} step={step}
  onCommit={(v) => { optimistic(id, { state: String(v) }); callService('number', 'set_value', id, { value: v }); }} />
```
(Remove now-unused `onChange` range handlers. Keep the fan percentage slider in `ToggleControls.tsx` as a raw input OR convert it the same way — converting is preferred for consistency: `<Slider ariaLabel="Speed" value={pct} min={0} max={100} onCommit={(v) => setPct(v)} />`.)

- [ ] **Step 3: Run the full web suite, typecheck, build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all pass. (The `LightControls.test.tsx` "shows a brightness slider" test asserts the label text `/brightness/i`, which is preserved; if it asserted a raw `slider` role, note that Radix Slider exposes `role="slider"` on the thumb, so `getByRole('slider')` still works.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/dashboard/EntityDetailSheet.tsx apps/web/src/controls
git commit -m "feat(web): device-info in sheet + tactile Slider controls"
```

---

## Task 6: Full verification

**Files:** none committed

- [ ] **Step 1: Whole workspace**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass.

- [ ] **Step 2: Visual smoke (against real HA, recommended)**

```
pnpm build
$env:HA_URL="http://<your-ha>:8123"; $env:HA_TOKEN="<token>"; $env:ASPECT_WEB_DIR="apps/web/dist"; node apps/server/dist/server.js
```
Open `http://127.0.0.1:8099`. Expected: a tab bar (Summary · Quick · your rooms), each room showing frosted squircle tiles with MDI icons, batteries on devices, climate/media as wide tiles; tapping a tile opens the Radix sheet with controls (tactile sliders) + Device info. Diagnostic/config noise should be gone.

- [ ] **Step 3: Confirm clean tree** — `git status --short` empty.

---

## Definition of Done

- [ ] The dashboard is a tab bar: Summary (placeholder) · Quick (placeholder) · one tab per non-empty room (+ Other).
- [ ] Room tiles use the Frost/MDI design, with battery shown on the device's primary tile and climate/media as wide tiles; diagnostic/config/noise entities are hidden.
- [ ] The detail sheet shows controls (with tactile `Slider`s) + a "Device info" section of sibling readings.
- [ ] `pnpm typecheck`, `pnpm test:run`, `pnpm build` all pass.

## Notes for the Next Plans

- **Plan 4 (Summary):** replace `SummaryTab` placeholder with status pills (`StatusPill`), presence, climate/weather, alerts, activity.
- **Plan 5 (Quick Access):** replace `QuickAccessTab` placeholder with pinned favorites (data already in the store via `favorites`/`setFavorite`); add a pin (star) affordance to the tile overflow + detail sheet.
- Consider a tile quick-toggle (tap-to-toggle vs tap-to-open) and wiring `Switch` into toggle controls.
