# Aspect — UI Overhaul Plan 5: Quick Access — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Quick Access placeholder with the user's **pinned favorites** rendered as tiles, and add a **pin/unpin (star)** affordance in the detail sheet. The favorites data layer (server SQLite store, sync, `favorites`/`setFavorite`) already exists from UI Plan 1 — this is the UI on top.

**Architecture:** `QuickAccessTab` reads `favorites` (entity IDs) from the store, maps them to live entities, and renders them with the existing `Tile`, opening the shared detail sheet via `onSelect` (passed from `AppShell`). `EntityDetailSheet` gains a star toggle that calls `setFavorite`. Optimistic-free: the server rebroadcasts the favorites list, which updates the store.

**Tech Stack:** unchanged.

**Prerequisite:** UI Plans 1–4 merged. Local pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if needed.

---

## File Structure

```
apps/web/src/dashboard/
  QuickAccessTab.tsx        MOD  favorites -> tiles (+ empty state)
  QuickAccessTab.test.tsx   NEW
  AppShell.tsx              MOD  pass onSelect to QuickAccessTab
  EntityDetailSheet.tsx     MOD  add pin/unpin star
  EntityDetailSheet.test.tsx NEW
```

---

## Task 1: Quick Access tab

**Files:** Modify `apps/web/src/dashboard/QuickAccessTab.tsx`, `apps/web/src/dashboard/AppShell.tsx`; Create `apps/web/src/dashboard/QuickAccessTab.test.tsx`

- [ ] **Step 1: Replace `apps/web/src/dashboard/QuickAccessTab.tsx`**

```tsx
import { type ReactElement } from 'react';
import { useConnectionStore } from '../store/connectionStore.js';
import { Tile } from '../ui/Tile.js';
import { iconFor, tintFor } from '../domain/icons.js';
import { formatState, isActive, friendlyName, domainOf } from '../domain/entities.js';

export function QuickAccessTab({ onSelect }: { onSelect: (entityId: string) => void }): ReactElement {
  const favorites = useConnectionStore((s) => s.favorites);
  const entities = useConnectionStore((s) => s.entities);

  const tiles = favorites
    .map((id) => entities[id])
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  if (tiles.length === 0) {
    return (
      <div className="grid gap-2">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Quick Access</h1>
        <p className="text-[15px] text-[var(--color-muted)]">
          No favorites yet. Open any device and tap the ☆ star to pin it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="m-0 mb-5 text-[26px] font-extrabold tracking-[-0.5px]">Quick Access</h1>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {tiles.map((entity) => (
          <Tile
            key={entity.entityId}
            path={iconFor(entity)}
            tint={tintFor(domainOf(entity.entityId))}
            name={friendlyName(entity, null)}
            state={formatState(entity)}
            active={isActive(entity)}
            wide={domainOf(entity.entityId) === 'climate' || domainOf(entity.entityId) === 'media_player'}
            onPress={() => onSelect(entity.entityId)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pass `onSelect` from `apps/web/src/dashboard/AppShell.tsx`.** Change the Quick panel line to:

```tsx
        <TabPanel value="__quick__"><QuickAccessTab onSelect={(id) => setSelectedId(id)} /></TabPanel>
```

- [ ] **Step 3: Write `apps/web/src/dashboard/QuickAccessTab.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAccessTab } from './QuickAccessTab.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[],
  registry: [] as never[], favorites: [] as string[],
};

describe('QuickAccessTab', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows an empty state when there are no favorites', () => {
    render(<QuickAccessTab onSelect={() => {}} />);
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();
  });

  it('renders pinned favorites and opens one', async () => {
    const onSelect = vi.fn();
    useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp'), 'scene.movie': e('scene.movie') },
      favorites: ['light.kitchen_lamp'],
    });
    render(<QuickAccessTab onSelect={onSelect} />);
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.queryByText('Movie')).not.toBeInTheDocument(); // not favorited
    await userEvent.click(screen.getByRole('button', { name: /kitchen lamp/i }));
    expect(onSelect).toHaveBeenCalledWith('light.kitchen_lamp');
  });
});
```

- [ ] **Step 4: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run dashboard/QuickAccessTab && pnpm --filter @aspect/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/dashboard/QuickAccessTab.tsx apps/web/src/dashboard/QuickAccessTab.test.tsx apps/web/src/dashboard/AppShell.tsx
git commit -m "feat(web): Quick Access tab renders pinned favorites"
```

---

## Task 2: Pin/unpin in the detail sheet

**Files:** Modify `apps/web/src/dashboard/EntityDetailSheet.tsx`; Create `apps/web/src/dashboard/EntityDetailSheet.test.tsx`

- [ ] **Step 1: Add the star toggle to `apps/web/src/dashboard/EntityDetailSheet.tsx`.** Add imports:
```tsx
import { mdiStar, mdiStarOutline } from '@mdi/js';
import { Icon } from '../ui/Icon.js';
import { setFavorite } from '../server-client/commands.js';
```
Read favorites from the store (next to the existing entity/registry selectors):
```tsx
  const favorites = useConnectionStore((s) => s.favorites);
  const isFav = entityId !== null && favorites.includes(entityId);
```
Render a pin button as the FIRST child inside the sheet body (above `formatState`), e.g.:
```tsx
          <button
            type="button"
            onClick={() => { if (entityId) setFavorite(entityId, !isFav); }}
            className="flex items-center gap-2 self-start rounded-[14px] border border-white/10 bg-[rgba(36,40,50,0.5)] px-3 py-2 text-[13px] font-semibold backdrop-blur-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ cornerShape: 'superellipse(4)' } as React.CSSProperties}
          >
            <Icon path={isFav ? mdiStar : mdiStarOutline} size={18} color={isFav ? '#ffd27d' : 'var(--color-muted)'} />
            {isFav ? 'Pinned' : 'Pin to Quick'}
          </button>
```
(Place it inside the existing `{entity && (<div className="grid gap-...">...)}` block, before the `formatState` line. Keep all existing content.)

- [ ] **Step 2: Write `apps/web/src/dashboard/EntityDetailSheet.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityDetailSheet } from './EntityDetailSheet.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const sent: unknown[] = [];
vi.mock('../server-client/commands.js', () => ({
  callService: () => {},
  setFavorite: (...a: unknown[]) => sent.push(a),
}));

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') } as Record<string, EntityState>,
  areas: [] as never[], devices: [] as never[], registry: [] as never[], favorites: [] as string[],
};

describe('EntityDetailSheet pin', () => {
  beforeEach(() => { sent.length = 0; useConnectionStore.setState({ ...base }); });

  it('pins an unpinned entity', async () => {
    render(<EntityDetailSheet entityId="light.kitchen_lamp" onClose={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /pin to quick/i }));
    expect(sent[0]).toEqual(['light.kitchen_lamp', true]);
  });

  it('shows "Pinned" when already a favorite', async () => {
    useConnectionStore.setState({ ...base, favorites: ['light.kitchen_lamp'] });
    render(<EntityDetailSheet entityId="light.kitchen_lamp" onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: /pinned/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the web suite, typecheck, build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/dashboard/EntityDetailSheet.tsx apps/web/src/dashboard/EntityDetailSheet.test.tsx
git commit -m "feat(web): pin/unpin favorites from the detail sheet"
```

---

## Task 3: Full verification

**Files:** none committed

- [ ] **Step 1: Whole workspace**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass.

- [ ] **Step 2: Visual smoke (against real HA, recommended).** Run the server; open a device's detail sheet, tap the star to pin it; switch to the Quick tab and confirm it appears; reload another device/browser and confirm it's still pinned (server-synced).

- [ ] **Step 3: Confirm clean tree** — `git status --short` empty.

---

## Definition of Done

- [ ] The Quick Access tab shows pinned favorites as tiles (with an empty-state hint), opening the shared detail sheet.
- [ ] The detail sheet has a star toggle that pins/unpins via `setFavorite`; pinned state reflects the synced favorites list.
- [ ] `pnpm typecheck`, `pnpm test:run`, `pnpm build` all pass.

## Notes for the Next Plans

- The UI overhaul (tabs + design system + rooms + summary + quick access) is now complete. Remaining roadmap: friendly onboarding + "Log in with Home Assistant" OAuth + a service allow-list (security), then Home Assistant add-on + Docker packaging for one-click install.
- Optional polish: tile overflow menu with a pin shortcut; status pills navigating to the relevant room; tile quick-toggle.
