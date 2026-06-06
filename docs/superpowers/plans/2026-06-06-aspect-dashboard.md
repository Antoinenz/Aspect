# Aspect — Auto-generated Dashboard + Design/Motion System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the entities/areas/devices/registry already flowing into the client store into the calm, auto-generated, room-based dashboard: a responsive grid of entity tiles grouped by room, with the approved visual system (adaptive light/dark, warm accent reserved for "active") and native motion (spring-based tile presses, a slide-up detail sheet over a blurred backdrop). This plan is presentational + navigational only — tiles open a read-only detail sheet; actual controls (toggling, brightness, climate) are Plan 4.

**Architecture:** All work is in `apps/web`. Pure logic (`domain/`, `dashboard/rooms.ts`) maps store data into a sorted room model and per-entity display metadata — fully unit-tested with no DOM. A small design system (`ui/theme.css` tokens + `ui/Tile.tsx` + `ui/Sheet.tsx`) provides the look and motion primitives. `dashboard/` composes rooms → sections → tiles, and a generic `EntityDetailSheet`. `App.tsx` swaps the proof-of-life counts for the real `Dashboard`, keeping a small connection badge for connecting/degraded states.

**Tech Stack:** (unchanged) React 19, Vite 6, Motion 11 (`motion/react`), Zustand 5, TypeScript ESM strict, Vitest + @testing-library/react + jsdom.

**Prerequisite:** Plan 2 merged. The store (`useConnectionStore`) already holds `entities: Record<string, EntityState>`, `areas: Area[]`, `devices: Device[]`, `registry: RegistryEntry[]`, plus `link`, `serverStatus`, `haConnected`. Local dev pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if `pnpm` is not found.

**Visual tokens (approved "calm blend"):**
- Dark: bg `#16161a`, surface `#1f1f25`, border `#2a2a31`, text `#f3f3f5`, muted `#a9a7b3`; active: surface `#262019`, border `#5a4a2e`, icon `#ffb84d`, text `#ffd9a0`.
- Light: bg `#f4f4f6`, surface `#ffffff`, border `#e9e9ee`, text `#16161a`, muted `#6b6b76`; active: surface `#fff7ea`, border `#f0d9ad`, icon `#ff9f1c`, text `#7a4e00`.
- Radii: card 22px, tile 17px, icon 11px. System font stack. Adaptive via `prefers-color-scheme`.

---

## File Structure

```
apps/web/src/
  domain/
    entities.ts          NEW  domainOf, SUPPORTED_DOMAINS, friendlyName, icon, isActive, formatState
    entities.test.ts     NEW
  dashboard/
    rooms.ts             NEW  buildRooms(): store data -> sorted Room[] with RoomEntity[]
    rooms.test.ts        NEW
    Dashboard.tsx        NEW  composes header + room sections + detail sheet
    Dashboard.test.tsx   NEW
    RoomSection.tsx      NEW  heading + responsive tile grid
    EntityDetailSheet.tsx NEW read-only entity detail using Sheet
  ui/
    theme.css            NEW  CSS variables (light/dark), reset, base typography
    Tile.tsx             NEW  pressable entity tile (Motion)
    Tile.test.tsx        NEW
    Sheet.tsx            NEW  slide-up sheet over blurred backdrop (Motion)
    Sheet.test.tsx       NEW
  App.tsx                MOD  render Dashboard; keep a small connection badge
  App.test.tsx           MOD
  main.tsx              MOD  import './ui/theme.css'
```

---

## Task 1: Domain helpers (pure)

**Files:** Create `apps/web/src/domain/entities.ts`, `apps/web/src/domain/entities.test.ts`

- [ ] **Step 1: Write the failing test `apps/web/src/domain/entities.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  domainOf,
  isSupported,
  friendlyName,
  domainIcon,
  isActive,
  formatState,
} from './entities.js';
import type { EntityState } from '@aspect/shared';

const e = (
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): EntityState => ({ entityId, state, attributes, lastChanged: 't', lastUpdated: 't' });

describe('domainOf', () => {
  it('extracts the domain', () => {
    expect(domainOf('light.kitchen')).toBe('light');
    expect(domainOf('binary_sensor.door')).toBe('binary_sensor');
  });
});

describe('isSupported', () => {
  it('accepts v1 domains and rejects others', () => {
    expect(isSupported('light.x')).toBe(true);
    expect(isSupported('climate.x')).toBe(true);
    expect(isSupported('camera.x')).toBe(false);
    expect(isSupported('media_player.x')).toBe(false);
  });
});

describe('friendlyName', () => {
  it('prefers the registry name', () => {
    expect(friendlyName(e('light.kitchen', 'on'), 'Kitchen Lamp')).toBe('Kitchen Lamp');
  });
  it('falls back to friendly_name attribute', () => {
    expect(friendlyName(e('light.kitchen', 'on', { friendly_name: 'Kitchen' }), null)).toBe('Kitchen');
  });
  it('prettifies the entity id as a last resort', () => {
    expect(friendlyName(e('light.living_room_lamp', 'on'), null)).toBe('Living Room Lamp');
  });
});

describe('domainIcon', () => {
  it('returns an icon per domain and a default', () => {
    expect(domainIcon('light')).toBeTypeOf('string');
    expect(domainIcon('unknowndomain')).toBeTypeOf('string');
  });
});

describe('isActive', () => {
  it('is true for on/open/unlocked, false otherwise', () => {
    expect(isActive(e('light.x', 'on'))).toBe(true);
    expect(isActive(e('cover.x', 'open'))).toBe(true);
    expect(isActive(e('lock.x', 'unlocked'))).toBe(true);
    expect(isActive(e('light.x', 'off'))).toBe(false);
    expect(isActive(e('sensor.x', '21.5'))).toBe(false);
    expect(isActive(e('light.x', 'unavailable'))).toBe(false);
  });
});

describe('formatState', () => {
  it('appends unit_of_measurement for sensors', () => {
    expect(formatState(e('sensor.temp', '21.5', { unit_of_measurement: '°C' }))).toBe('21.5 °C');
  });
  it('shows brightness percent for lights that are on', () => {
    expect(formatState(e('light.x', 'on', { brightness: 128 }))).toBe('On · 50%');
  });
  it('capitalizes simple states', () => {
    expect(formatState(e('switch.x', 'off'))).toBe('Off');
    expect(formatState(e('lock.x', 'unlocked'))).toBe('Unlocked');
  });
  it('shows a friendly label for unavailable', () => {
    expect(formatState(e('light.x', 'unavailable'))).toBe('Unavailable');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run domain/entities`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/web/src/domain/entities.ts`**

```ts
import type { EntityState } from '@aspect/shared';

/** Domains Aspect renders in v1. */
export const SUPPORTED_DOMAINS: ReadonlySet<string> = new Set([
  'light',
  'switch',
  'climate',
  'cover',
  'lock',
  'fan',
  'scene',
  'sensor',
  'binary_sensor',
]);

const ICONS: Record<string, string> = {
  light: '💡',
  switch: '🔌',
  climate: '🌡️',
  cover: '🪟',
  lock: '🔒',
  fan: '🌀',
  scene: '🎬',
  sensor: '📈',
  binary_sensor: '⚪',
};

const ACTIVE_STATES: Record<string, string> = {
  light: 'on',
  switch: 'on',
  fan: 'on',
  binary_sensor: 'on',
  cover: 'open',
  lock: 'unlocked',
};

export function domainOf(entityId: string): string {
  const dot = entityId.indexOf('.');
  return dot === -1 ? entityId : entityId.slice(0, dot);
}

export function isSupported(entityId: string): boolean {
  return SUPPORTED_DOMAINS.has(domainOf(entityId));
}

export function prettifyId(entityId: string): string {
  const obj = entityId.slice(entityId.indexOf('.') + 1);
  return obj
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function friendlyName(
  entity: EntityState,
  registryName: string | null,
): string {
  if (registryName) return registryName;
  const fn = entity.attributes.friendly_name;
  if (typeof fn === 'string' && fn.length > 0) return fn;
  return prettifyId(entity.entityId);
}

export function domainIcon(domain: string): string {
  return ICONS[domain] ?? '◾';
}

export function isActive(entity: EntityState): boolean {
  if (entity.state === 'unavailable' || entity.state === 'unknown') return false;
  const expected = ACTIVE_STATES[domainOf(entity.entityId)];
  return expected !== undefined && entity.state === expected;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatState(entity: EntityState): string {
  if (entity.state === 'unavailable') return 'Unavailable';
  if (entity.state === 'unknown') return 'Unknown';

  const domain = domainOf(entity.entityId);

  if (domain === 'light' && entity.state === 'on') {
    const b = entity.attributes.brightness;
    if (typeof b === 'number') {
      return `On · ${Math.round((b / 255) * 100)}%`;
    }
    return 'On';
  }

  if (domain === 'sensor') {
    const unit = entity.attributes.unit_of_measurement;
    return typeof unit === 'string' ? `${entity.state} ${unit}` : entity.state;
  }

  return capitalize(entity.state);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run domain/entities`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain
git commit -m "feat(web): add pure domain helpers (names, icons, state formatting)"
```

---

## Task 2: Room grouping (pure)

**Files:** Create `apps/web/src/dashboard/rooms.ts`, `apps/web/src/dashboard/rooms.test.ts`

- [ ] **Step 1: Write the failing test `apps/web/src/dashboard/rooms.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildRooms } from './rooms.js';
import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';

const e = (entityId: string, state = 'on'): EntityState => ({
  entityId,
  state,
  attributes: {},
  lastChanged: 't',
  lastUpdated: 't',
});
const reg = (
  entityId: string,
  areaId: string | null,
  deviceId: string | null = null,
  name: string | null = null,
): RegistryEntry => ({ entityId, areaId, deviceId, name, platform: 'demo' });

describe('buildRooms', () => {
  it('groups entities by their registry area, sorted by area then name', () => {
    const entities: Record<string, EntityState> = {
      'light.b': e('light.b'),
      'light.a': e('light.a'),
    };
    const areas: Area[] = [
      { areaId: 'living', name: 'Living Room' },
      { areaId: 'kitchen', name: 'Kitchen' },
    ];
    const registry: RegistryEntry[] = [
      reg('light.a', 'kitchen', null, 'A Light'),
      reg('light.b', 'living', null, 'B Light'),
    ];
    const rooms = buildRooms(entities, areas, [], registry);
    expect(rooms.map((r) => r.name)).toEqual(['Kitchen', 'Living Room']);
    expect(rooms[0]?.entities[0]?.name).toBe('A Light');
  });

  it('resolves area through the device when the entity has none', () => {
    const entities = { 'light.a': e('light.a') };
    const areas: Area[] = [{ areaId: 'kitchen', name: 'Kitchen' }];
    const devices: Device[] = [{ deviceId: 'd1', name: 'Bulb', areaId: 'kitchen' }];
    const registry: RegistryEntry[] = [reg('light.a', null, 'd1')];
    const rooms = buildRooms(entities, areas, devices, registry);
    expect(rooms[0]?.name).toBe('Kitchen');
  });

  it('puts area-less entities in an "Other" room at the end', () => {
    const entities = { 'light.a': e('light.a'), 'light.b': e('light.b') };
    const areas: Area[] = [{ areaId: 'kitchen', name: 'Kitchen' }];
    const registry: RegistryEntry[] = [reg('light.a', 'kitchen')];
    const rooms = buildRooms(entities, areas, [], registry);
    expect(rooms.map((r) => r.name)).toEqual(['Kitchen', 'Other']);
    expect(rooms[1]?.entities[0]?.entity.entityId).toBe('light.b');
  });

  it('excludes unsupported domains and empty rooms', () => {
    const entities = { 'camera.front': e('camera.front'), 'light.a': e('light.a') };
    const areas: Area[] = [
      { areaId: 'kitchen', name: 'Kitchen' },
      { areaId: 'garden', name: 'Garden' },
    ];
    const registry: RegistryEntry[] = [
      reg('light.a', 'kitchen'),
      reg('camera.front', 'garden'),
    ];
    const rooms = buildRooms(entities, areas, [], registry);
    expect(rooms.map((r) => r.name)).toEqual(['Kitchen']);
  });

  it('attaches domain and resolved display name to each entity', () => {
    const entities = { 'light.kitchen_lamp': e('light.kitchen_lamp') };
    const rooms = buildRooms(entities, [], [], []);
    const re = rooms[0]?.entities[0];
    expect(re?.domain).toBe('light');
    expect(re?.name).toBe('Kitchen Lamp');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run dashboard/rooms`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/web/src/dashboard/rooms.ts`**

```ts
import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';
import { domainOf, friendlyName, isSupported } from '../domain/entities.js';

export interface RoomEntity {
  entity: EntityState;
  name: string;
  domain: string;
}

export interface Room {
  areaId: string;
  name: string;
  entities: RoomEntity[];
}

const UNASSIGNED = '__unassigned__';

/**
 * Joins entities to areas (directly via the entity registry, or indirectly via
 * the entity's device) and groups them into sorted rooms. Unsupported domains
 * are dropped; area-less entities land in a trailing "Other" room. Pure.
 */
export function buildRooms(
  entities: Record<string, EntityState>,
  areas: Area[],
  devices: Device[],
  registry: RegistryEntry[],
): Room[] {
  const regByEntity = new Map(registry.map((r) => [r.entityId, r]));
  const deviceById = new Map(devices.map((d) => [d.deviceId, d]));
  const areaName = new Map(areas.map((a) => [a.areaId, a.name]));

  const byArea = new Map<string, RoomEntity[]>();

  for (const entity of Object.values(entities)) {
    if (!isSupported(entity.entityId)) continue;
    const reg = regByEntity.get(entity.entityId);
    const deviceArea = reg?.deviceId
      ? (deviceById.get(reg.deviceId)?.areaId ?? null)
      : null;
    const areaId = reg?.areaId ?? deviceArea ?? UNASSIGNED;

    const roomEntity: RoomEntity = {
      entity,
      name: friendlyName(entity, reg?.name ?? null),
      domain: domainOf(entity.entityId),
    };
    const list = byArea.get(areaId);
    if (list) list.push(roomEntity);
    else byArea.set(areaId, [roomEntity]);
  }

  const sortByName = (a: RoomEntity, b: RoomEntity): number =>
    a.name.localeCompare(b.name);

  const rooms: Room[] = [];
  for (const [areaId, list] of byArea) {
    if (areaId === UNASSIGNED) continue;
    rooms.push({
      areaId,
      name: areaName.get(areaId) ?? areaId,
      entities: list.sort(sortByName),
    });
  }
  rooms.sort((a, b) => a.name.localeCompare(b.name));

  const unassigned = byArea.get(UNASSIGNED);
  if (unassigned && unassigned.length > 0) {
    rooms.push({
      areaId: UNASSIGNED,
      name: 'Other',
      entities: unassigned.sort(sortByName),
    });
  }

  return rooms;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run dashboard/rooms`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/dashboard/rooms.ts apps/web/src/dashboard/rooms.test.ts
git commit -m "feat(web): add pure room-grouping logic"
```

---

## Task 3: Design tokens and base styles

**Files:** Create `apps/web/src/ui/theme.css`; Modify `apps/web/src/main.tsx`

- [ ] **Step 1: Create `apps/web/src/ui/theme.css`**

```css
:root {
  --bg: #16161a;
  --surface: #1f1f25;
  --border: #2a2a31;
  --text: #f3f3f5;
  --muted: #a9a7b3;
  --active-surface: #262019;
  --active-border: #5a4a2e;
  --active-icon: #ffb84d;
  --active-text: #ffd9a0;
  --accent: #ffb84d;

  --radius-card: 22px;
  --radius-tile: 17px;
  --radius-icon: 11px;

  --font: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;

  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f4f4f6;
    --surface: #ffffff;
    --border: #e9e9ee;
    --text: #16161a;
    --muted: #6b6b76;
    --active-surface: #fff7ea;
    --active-border: #f0d9ad;
    --active-icon: #ff9f1c;
    --active-text: #7a4e00;
    --accent: #ff9f1c;
    color-scheme: light;
  }
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
}

/* Respect users who prefer reduced motion. */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Import the theme in `apps/web/src/main.tsx`**

Add this import at the very top of the file (above the React imports):

```tsx
import './ui/theme.css';
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `pnpm --filter @aspect/web build`
Expected: build succeeds; CSS is emitted into `dist/assets`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/ui/theme.css apps/web/src/main.tsx
git commit -m "feat(web): add calm light/dark design tokens and base styles"
```

---

## Task 4: Tile primitive

**Files:** Create `apps/web/src/ui/Tile.tsx`, `apps/web/src/ui/Tile.test.tsx`

- [ ] **Step 1: Write the failing test `apps/web/src/ui/Tile.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tile } from './Tile.js';

describe('Tile', () => {
  it('renders icon, name and state', () => {
    render(<Tile icon="💡" name="Kitchen Lamp" state="On · 80%" active onPress={() => {}} />);
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.getByText('On · 80%')).toBeInTheDocument();
  });

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn();
    render(<Tile icon="💡" name="Lamp" state="Off" active={false} onPress={onPress} />);
    await userEvent.click(screen.getByRole('button', { name: /lamp/i }));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Add the test runner dependency `@testing-library/user-event`**

Add to `apps/web/package.json` devDependencies:

```json
    "@testing-library/user-event": "14.5.2"
```

Then run: `pnpm install`

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run ui/Tile`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `apps/web/src/ui/Tile.tsx`**

```tsx
import { motion } from 'motion/react';
import type { ReactElement } from 'react';

export interface TileProps {
  icon: string;
  name: string;
  state: string;
  active: boolean;
  onPress: () => void;
}

export function Tile({ icon, name, state, active, onPress }: TileProps): ReactElement {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        appearance: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        padding: 15,
        borderRadius: 'var(--radius-tile)',
        background: active ? 'var(--active-surface)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--active-border)' : 'var(--border)'}`,
        color: active ? 'var(--active-text)' : 'var(--text)',
        font: 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-icon)',
          fontSize: 17,
          marginBottom: 12,
          background: active ? 'var(--active-icon)' : 'var(--border)',
        }}
      >
        {icon}
      </span>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{name}</span>
      <span style={{ display: 'block', fontSize: 11.5, marginTop: 3, opacity: 0.65 }}>
        {state}
      </span>
    </motion.button>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run ui/Tile`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/Tile.tsx apps/web/src/ui/Tile.test.tsx apps/web/package.json
git commit -m "feat(web): add pressable Tile primitive"
```

---

## Task 5: Sheet primitive

**Files:** Create `apps/web/src/ui/Sheet.tsx`, `apps/web/src/ui/Sheet.test.tsx`

- [ ] **Step 1: Write the failing test `apps/web/src/ui/Sheet.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet.js';

describe('Sheet', () => {
  it('renders children when open', () => {
    render(
      <Sheet open onClose={() => {}} title="Kitchen Lamp">
        <p>Sheet body</p>
      </Sheet>,
    );
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="Hidden">
        <p>Sheet body</p>
      </Sheet>,
    );
    expect(screen.queryByText('Sheet body')).not.toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="X">
        <p>body</p>
      </Sheet>,
    );
    await userEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run ui/Sheet`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/web/src/ui/Sheet.tsx`**

```tsx
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A bottom sheet that slides up over a blurred backdrop — the "native depth"
 * surface. Closes on backdrop click or Escape. Content is unmounted when closed.
 */
export function Sheet({ open, onClose, title, children }: SheetProps): ReactElement {
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="sheet-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(ev) => ev.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              borderTopLeftRadius: 'var(--radius-card)',
              borderTopRightRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                background: 'var(--border)',
                margin: '0 auto 16px',
              }}
            />
            <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 650 }}>{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run ui/Sheet`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/Sheet.tsx apps/web/src/ui/Sheet.test.tsx
git commit -m "feat(web): add slide-up Sheet primitive"
```

---

## Task 6: Entity detail sheet (read-only)

**Files:** Create `apps/web/src/dashboard/EntityDetailSheet.tsx`

- [ ] **Step 1: Implement `apps/web/src/dashboard/EntityDetailSheet.tsx`**

```tsx
import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { Sheet } from '../ui/Sheet.js';
import { formatState } from '../domain/entities.js';
import type { RoomEntity } from './rooms.js';

export interface EntityDetailSheetProps {
  roomEntity: RoomEntity | null;
  onClose: () => void;
}

/**
 * Read-only detail view for a tapped entity. Real controls (toggle, brightness,
 * climate, etc.) arrive in Plan 4; this establishes the surface and shows the
 * current state + attributes.
 */
export function EntityDetailSheet({
  roomEntity,
  onClose,
}: EntityDetailSheetProps): ReactElement {
  return (
    <Sheet open={roomEntity !== null} onClose={onClose} title={roomEntity?.name ?? ''}>
      {roomEntity && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>
            {formatState(roomEntity.entity)}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Controls are coming soon.
          </p>
          <AttributeList entity={roomEntity.entity} />
        </div>
      )}
    </Sheet>
  );
}

function AttributeList({ entity }: { entity: EntityState }): ReactElement | null {
  const entries = Object.entries(entity.attributes);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Attributes
      </span>
      {entries.map(([key, value]) => (
        <div
          key={key}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}
        >
          <span style={{ color: 'var(--muted)' }}>{key}</span>
          <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>
            {formatAttr(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatAttr(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aspect/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/dashboard/EntityDetailSheet.tsx
git commit -m "feat(web): add read-only entity detail sheet"
```

---

## Task 7: Room section

**Files:** Create `apps/web/src/dashboard/RoomSection.tsx`

- [ ] **Step 1: Implement `apps/web/src/dashboard/RoomSection.tsx`**

```tsx
import type { ReactElement } from 'react';
import { Tile } from '../ui/Tile.js';
import { domainIcon, formatState, isActive } from '../domain/entities.js';
import type { Room, RoomEntity } from './rooms.js';

export interface RoomSectionProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomSection({ room, onSelect }: RoomSectionProps): ReactElement {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 17,
          fontWeight: 650,
          letterSpacing: '-0.3px',
        }}
      >
        {room.name}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 13,
        }}
      >
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            icon={domainIcon(re.domain)}
            name={re.name}
            state={formatState(re.entity)}
            active={isActive(re.entity)}
            onPress={() => onSelect(re)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aspect/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/dashboard/RoomSection.tsx
git commit -m "feat(web): add RoomSection with responsive tile grid"
```

---

## Task 8: Dashboard composition

**Files:** Create `apps/web/src/dashboard/Dashboard.tsx`, `apps/web/src/dashboard/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test `apps/web/src/dashboard/Dashboard.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (entityId: string, state = 'on'): EntityState => ({
  entityId,
  state,
  attributes: {},
  lastChanged: 't',
  lastUpdated: 't',
});

const baseState = {
  link: 'connected' as const,
  serverStatus: 'online' as const,
  haConnected: true,
  entities: {} as Record<string, EntityState>,
  areas: [] as never[],
  devices: [] as never[],
  registry: [] as never[],
};

describe('Dashboard', () => {
  beforeEach(() => useConnectionStore.setState({ ...baseState }));

  it('shows an empty state when there are no entities', () => {
    render(<Dashboard />);
    expect(screen.getByText(/no devices/i)).toBeInTheDocument();
  });

  it('renders room sections with tiles', () => {
    act(() =>
      useConnectionStore.setState({
        ...baseState,
        entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
        areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
        registry: [
          {
            entityId: 'light.kitchen_lamp',
            areaId: 'kitchen',
            deviceId: null,
            name: null,
            platform: 'demo',
          },
        ],
      }),
    );
    render(<Dashboard />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
  });

  it('opens the detail sheet when a tile is tapped', async () => {
    act(() =>
      useConnectionStore.setState({
        ...baseState,
        entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
      }),
    );
    render(<Dashboard />);
    await userEvent.click(screen.getByRole('button', { name: /kitchen lamp/i }));
    expect(await screen.findByText(/controls are coming soon/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aspect/web test:run dashboard/Dashboard`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/web/src/dashboard/Dashboard.tsx`**

```tsx
import { useMemo, useState, type ReactElement } from 'react';
import { useConnectionStore } from '../store/connectionStore.js';
import { buildRooms, type RoomEntity } from './rooms.js';
import { RoomSection } from './RoomSection.js';
import { EntityDetailSheet } from './EntityDetailSheet.js';

export function Dashboard(): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const areas = useConnectionStore((s) => s.areas);
  const devices = useConnectionStore((s) => s.devices);
  const registry = useConnectionStore((s) => s.registry);

  const rooms = useMemo(
    () => buildRooms(entities, areas, devices, registry),
    [entities, areas, devices, registry],
  );

  const [selected, setSelected] = useState<RoomEntity | null>(null);

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 1100,
        margin: '0 auto',
        padding: 'calc(24px + env(safe-area-inset-top)) 20px 40px',
      }}
    >
      <header style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
          Home
        </h1>
      </header>

      {rooms.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          No devices to show yet.
        </p>
      ) : (
        rooms.map((room) => (
          <RoomSection key={room.areaId} room={room} onSelect={setSelected} />
        ))
      )}

      <EntityDetailSheet roomEntity={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @aspect/web test:run dashboard/Dashboard`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/dashboard/Dashboard.tsx apps/web/src/dashboard/Dashboard.test.tsx
git commit -m "feat(web): compose room dashboard with detail sheet"
```

---

## Task 9: Wire the dashboard into App with a connection badge

Replace the proof-of-life counts with the real `Dashboard`, but keep a small fixed badge that surfaces connection problems (connecting/degraded) without obscuring the dashboard.

**Files:** Modify (replace) `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`

- [ ] **Step 1: Replace `apps/web/src/App.tsx`**

```tsx
import { useEffect, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { connectToServer } from './server-client/socket.js';
import { useConnectionStore } from './store/connectionStore.js';
import { Dashboard } from './dashboard/Dashboard.js';

export function App(): ReactElement {
  const link = useConnectionStore((s) => s.link);
  const serverStatus = useConnectionStore((s) => s.serverStatus);
  const haConnected = useConnectionStore((s) => s.haConnected);

  useEffect(() => connectToServer(), []);

  const healthy = link === 'connected' && serverStatus === 'online' && haConnected;
  const badge =
    link !== 'connected'
      ? 'Connecting…'
      : serverStatus === 'online' && !haConnected
        ? 'Home Assistant offline'
        : serverStatus === 'degraded'
          ? 'Reconnecting…'
          : null;

  return (
    <>
      <Dashboard />
      <AnimatePresence>
        {!healthy && badge && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'calc(18px + env(safe-area-inset-bottom))',
              padding: '10px 18px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              fontSize: 13.5,
              fontWeight: 600,
              zIndex: 40,
            }}
          >
            {badge}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Replace `apps/web/src/App.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from './App.js';
import { useConnectionStore } from './store/connectionStore.js';

vi.mock('./server-client/socket.js', () => ({
  connectToServer: () => () => undefined,
}));

const base = {
  link: 'disconnected' as const,
  serverStatus: null,
  haConnected: false,
  entities: {},
  areas: [],
  devices: [],
  registry: [],
};

describe('App', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows a connecting badge before the link is up', () => {
    render(<App />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('hides the badge when fully healthy', () => {
    render(<App />);
    act(() =>
      useConnectionStore.setState({
        ...base,
        link: 'connected',
        serverStatus: 'online',
        haConnected: true,
      }),
    );
    expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  });

  it('always renders the dashboard shell (Home header)', () => {
    render(<App />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the web suite, typecheck, and build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all tests pass; no type errors; build emits `dist` with CSS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): render the room dashboard with a connection badge"
```

---

## Task 10: Full verification

**Files:** none committed

- [ ] **Step 1: Run the whole workspace (what CI runs)**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass.

- [ ] **Step 2: Visual smoke (manual, against real HA)**

If a real Home Assistant is available:

```
pnpm build
$env:HA_URL="http://<your-ha>:8123"; $env:HA_TOKEN="<token>"; $env:ASPECT_WEB_DIR="apps/web/dist"; node apps/server/dist/server.js
```

Open `http://127.0.0.1:8099`. Expected: a "Home" header, your rooms as sections, tiles for supported entities with the warm "active" highlight on things that are on/open/unlocked, and tapping a tile slides up a detail sheet. No connection badge when healthy.

- [ ] **Step 3: Confirm a clean tree**

Run: `git status --short`
Expected: empty.

- [ ] **Step 4: No commit** (verification only).

---

## Definition of Done

- [ ] `pnpm typecheck` and `pnpm test:run` pass; `pnpm build` emits the dashboard + CSS.
- [ ] Entities are grouped into sorted rooms (registry area, then device area, else "Other"), excluding unsupported domains and empty rooms.
- [ ] Tiles show icon/name/state with the warm active highlight; tapping opens a read-only detail sheet over a blurred backdrop.
- [ ] Adaptive light/dark via `prefers-color-scheme`; reduced-motion respected.
- [ ] The dashboard renders even while disconnected (empty state), with a connection badge for connecting/degraded/HA-offline.

## Notes for the Next Plan (Plan 4 — Domain Controls)

- Controls need a client→server command channel: extend `ClientToServerMessage` with a `call_service` message; handle it in `clientChannel.ts` by calling `connection.callService(...)` via a new method on the HA connection layer; apply optimistic updates in the store and reconcile against the authoritative `entity_update`.
- `EntityDetailSheet` is the home for per-domain controls (light brightness/color, climate dial, cover position). `Tile` may gain a quick-action (tap-to-toggle vs tap-to-open) once the command channel exists.
- The detail sheet currently shows raw attributes — Plan 4 replaces the "Controls are coming soon" block with real controls per domain.
