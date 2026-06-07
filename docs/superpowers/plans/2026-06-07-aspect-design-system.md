# Aspect — UI Overhaul Plan 2: Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Apple/"Frost" design system — Tailwind v4 + Radix primitives + MDI icons + Plus Jakarta Sans — and build the reusable primitives (`Squircle`, `Icon`/`iconFor`, restyled `Tile`, Radix `Sheet`, `Tabs`, `Slider`, `Switch`, `StatusPill`). No new screens; the existing dashboard keeps working and the restyled `Tile`/`Sheet` make it look like the approved mockups.

**Architecture:** Tailwind v4 via the `@tailwindcss/vite` plugin with CSS-first `@theme` tokens (frosted surfaces, squircle radii, fonts, blur). Radix headless primitives are wrapped in thin `ui/` components styled with our tokens. A cross-browser `Squircle` provides iOS continuous corners (CSS `corner-shape` where supported + SVG-mask fallback). MDI icons via `@mdi/js` paths + `@mdi/react`.

**Tech Stack additions (web):** `tailwindcss@4`, `@tailwindcss/vite@4`, `@fontsource-variable/plus-jakarta-sans`, `@mdi/js`, `@mdi/react`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-tooltip`.

**Prerequisite:** UI Plan 1 merged. Local pnpm path note: prefix PowerShell with `$env:Path = "C:\Users\antoi\AppData\Roaming\npm;$env:Path";` if needed. Vitest is unaffected by Tailwind (its config has no Tailwind plugin and `css` processing is off, so CSS imports are inert in tests).

---

## File Structure

```
apps/web/
  package.json                 MOD  add deps
  vite.config.ts               MOD  add tailwindcss() plugin
  src/main.tsx                 MOD  import the font
  src/ui/theme.css             MOD  @import "tailwindcss" + @theme tokens + base
  src/ui/tokens.ts             NEW  shared TS constants (squircle radii, blur) for inline use
  src/ui/Squircle.tsx          NEW  + Squircle.test.tsx
  src/ui/Icon.tsx              NEW  MDI renderer + Icon.test.tsx
  src/domain/icons.ts          NEW  iconFor(entity) + tintFor(domain) + icons.test.ts
  src/ui/Tile.tsx              MOD  restyle (squircle, frosted, Frost-active, battery, size) + Tile.test.tsx update
  src/ui/Sheet.tsx             MOD  reimplement on Radix Dialog (same props) + Sheet.test.tsx update
  src/ui/Tabs.tsx              NEW  + Tabs.test.tsx
  src/ui/Slider.tsx            NEW  Radix slider
  src/ui/Switch.tsx            NEW  Radix switch
  src/ui/StatusPill.tsx        NEW
```

---

## Task 1: Tailwind v4 + font tooling (no visual regressions)

**Files:** Modify `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/ui/theme.css`

- [ ] **Step 1: Add deps to `apps/web/package.json`.** Add to `dependencies`: `"@fontsource-variable/plus-jakarta-sans": "5.1.1"`. Add to `devDependencies`: `"tailwindcss": "4.0.0"`, `"@tailwindcss/vite": "4.0.0"`. Run `pnpm install`.

- [ ] **Step 2: Add the Tailwind Vite plugin in `apps/web/vite.config.ts`.** Import and register it (keep react + VitePWA):

```ts
import tailwindcss from '@tailwindcss/vite';
// plugins: [react(), tailwindcss(), VitePWA({...})]
```
Add `tailwindcss()` to the `plugins` array right after `react()`.

- [ ] **Step 3: Import the font in `apps/web/src/main.tsx`.** Add at the very top (above the theme.css import):
```tsx
import '@fontsource-variable/plus-jakarta-sans';
```

- [ ] **Step 4: Replace `apps/web/src/ui/theme.css`** with Tailwind v4 + tokens:

```css
@import "tailwindcss";

@theme {
  --font-display: "Plus Jakarta Sans Variable", system-ui, -apple-system,
    "Segoe UI", Roboto, sans-serif;

  --color-bg: #0e0f13;
  --color-surface: rgba(36, 40, 50, 0.5);
  --color-elevated: rgba(40, 44, 54, 0.55);
  --color-border: rgba(255, 255, 255, 0.10);
  --color-text: #f4f5f7;
  --color-muted: rgba(235, 238, 245, 0.62);
  --color-frost: #f6f7f9;
  --color-frost-text: #15161a;
  --color-frost-muted: #565a66;
  --color-danger: #ff8a8a;

  --radius-tile: 24px;
  --radius-chip: 13px;
  --radius-pill: 16px;

  --blur-frost: 22px;
}

@layer base {
  html, body, #root { height: 100%; margin: 0; }
  body {
    font-family: var(--font-display);
    color: var(--color-text);
    background:
      radial-gradient(130% 90% at 75% -10%, #3b4a63 0%, rgba(59,74,99,0) 55%),
      radial-gradient(120% 90% at 0% 110%, #4a3b30 0%, rgba(74,59,48,0) 50%),
      linear-gradient(180deg, #1a1e26 0%, #15161c 60%, #1b1812 100%);
    background-attachment: fixed;
    -webkit-font-smoothing: antialiased;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
}
```

- [ ] **Step 5: Create `apps/web/src/ui/tokens.ts`** (constants for inline/JS use, mirroring CSS):

```ts
export const SQUIRCLE = 4; // superellipse exponent for iOS-style corners
export const RADIUS = { tile: 24, chip: 13, pill: 16 } as const;
export const FROST_BLUR = '22px';
```

- [ ] **Step 6: Verify build + tests still pass**

Run: `pnpm --filter @aspect/web build && pnpm --filter @aspect/web test:run`
Expected: build succeeds (Tailwind compiles; CSS + font emitted); all existing web tests still pass (CSS is inert under Vitest).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/vite.config.ts apps/web/src/main.tsx apps/web/src/ui/theme.css apps/web/src/ui/tokens.ts pnpm-lock.yaml
git commit -m "feat(web): set up Tailwind v4, tokens, and Plus Jakarta font"
```

---

## Task 2: MDI icon system

**Files:** Create `apps/web/src/ui/Icon.tsx`, `apps/web/src/ui/Icon.test.tsx`, `apps/web/src/domain/icons.ts`, `apps/web/src/domain/icons.test.ts`. Add deps `@mdi/js`, `@mdi/react`.

- [ ] **Step 1: Add deps.** In `apps/web/package.json` dependencies add `"@mdi/js": "7.4.47"`, `"@mdi/react": "1.6.1"`. Run `pnpm install`.

- [ ] **Step 2: Create `apps/web/src/ui/Icon.tsx`**

```tsx
import MdiIcon from '@mdi/react';
import type { ReactElement } from 'react';

/** Renders an MDI path. `path` is an `mdi*` export from @mdi/js. */
export function Icon({
  path,
  size = 22,
  color = 'currentColor',
}: {
  path: string;
  size?: number;
  color?: string;
}): ReactElement {
  return <MdiIcon path={path} size={`${size}px`} color={color} />;
}
```

- [ ] **Step 3: Write `apps/web/src/domain/icons.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { iconFor } from './icons.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state: 'on', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

describe('iconFor', () => {
  it('returns a non-empty MDI path for known domains', () => {
    expect(iconFor(e('light.k'))).toBeTruthy();
    expect(iconFor(e('climate.k'))).toBeTruthy();
    expect(iconFor(e('lock.k'))).toBeTruthy();
  });
  it('uses device_class for sensors (battery, temperature)', () => {
    expect(iconFor(e('sensor.b', { device_class: 'battery' }))).not.toBe(iconFor(e('sensor.t', { device_class: 'temperature' })));
  });
  it('falls back to a default path for unknown domains', () => {
    expect(iconFor(e('mystery.x'))).toBeTruthy();
  });
});
```

- [ ] **Step 4: Implement `apps/web/src/domain/icons.ts`**

```ts
import {
  mdiLightbulb, mdiCeilingLight, mdiPowerSocket, mdiThermostat, mdiSnowflake,
  mdiBlindsHorizontal, mdiLock, mdiFan, mdiPalette, mdiScriptText, mdiRobot,
  mdiGestureTapButton, mdiFormatListBulleted, mdiTuneVertical, mdiSpeaker,
  mdiThermometer, mdiWaterPercent, mdiFlash, mdiMotionSensor, mdiDoorOpen,
  mdiWeatherPartlyCloudy, mdiToggleSwitchVariant, mdiHelpCircleOutline,
} from '@mdi/js';
import { domainOf } from './entities.js';
import type { EntityState } from '@aspect/shared';

const DOMAIN_ICON: Record<string, string> = {
  light: mdiLightbulb,
  switch: mdiToggleSwitchVariant,
  climate: mdiThermostat,
  cover: mdiBlindsHorizontal,
  lock: mdiLock,
  fan: mdiFan,
  scene: mdiPalette,
  script: mdiScriptText,
  automation: mdiRobot,
  button: mdiGestureTapButton,
  select: mdiFormatListBulleted,
  number: mdiTuneVertical,
  media_player: mdiSpeaker,
};

const SENSOR_CLASS_ICON: Record<string, string> = {
  battery: mdiFlash,
  temperature: mdiThermometer,
  humidity: mdiWaterPercent,
  power: mdiFlash,
  motion: mdiMotionSensor,
  door: mdiDoorOpen,
  window: mdiDoorOpen,
};

/** Best MDI path for an entity, using device_class for sensors. */
export function iconFor(entity: EntityState): string {
  const domain = domainOf(entity.entityId);
  if (domain === 'sensor' || domain === 'binary_sensor') {
    const dc = entity.attributes.device_class;
    if (typeof dc === 'string' && SENSOR_CLASS_ICON[dc]) return SENSOR_CLASS_ICON[dc]!;
    return domain === 'binary_sensor' ? mdiMotionSensor : mdiThermometer;
  }
  if (domain === 'weather') return mdiWeatherPartlyCloudy;
  if (domain === 'ceiling_light') return mdiCeilingLight;
  if (domain === 'outlet') return mdiPowerSocket;
  if (domain === 'air') return mdiSnowflake;
  return DOMAIN_ICON[domain] ?? mdiHelpCircleOutline;
}

/** Subtle icon tint by domain (Apple-style); null = neutral. */
export function tintFor(domain: string): string | null {
  if (domain === 'light') return '#ffd27d';
  if (domain === 'climate' || domain === 'cover') return '#86c2ff';
  if (domain === 'lock') return '#8ee6b0';
  return null;
}
```

- [ ] **Step 5: Write `apps/web/src/ui/Icon.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mdiLightbulb } from '@mdi/js';
import { Icon } from './Icon.js';

describe('Icon', () => {
  it('renders an svg path', () => {
    const { container } = render(<Icon path={mdiLightbulb} />);
    expect(container.querySelector('svg path')).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run icons && pnpm --filter @aspect/web test:run ui/Icon && pnpm --filter @aspect/web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/src/ui/Icon.tsx apps/web/src/ui/Icon.test.tsx apps/web/src/domain/icons.ts apps/web/src/domain/icons.test.ts pnpm-lock.yaml
git commit -m "feat(web): add MDI Icon component and iconFor mapping"
```

---

## Task 3: Squircle primitive

**Files:** Create `apps/web/src/ui/Squircle.tsx`, `apps/web/src/ui/Squircle.test.tsx`

- [ ] **Step 1: Write `apps/web/src/ui/Squircle.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Squircle } from './Squircle.js';

describe('Squircle', () => {
  it('renders children and applies a border-radius', () => {
    render(<Squircle radius={24} data-testid="sq"><span>hi</span></Squircle>);
    const el = screen.getByTestId('sq');
    expect(el).toHaveTextContent('hi');
    expect(el.style.borderRadius).toBe('24px');
  });
});
```

- [ ] **Step 2: Implement `apps/web/src/ui/Squircle.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react';
import { SQUIRCLE } from './tokens.js';

/**
 * iOS-style continuous-corner container. Uses CSS `corner-shape: superellipse`
 * where supported (Chrome/Edge) and degrades to a normal rounded radius on
 * Safari/Firefox until those ship it. `border-radius` is always set so the
 * shape is correct everywhere; the superellipse just squares the curve.
 */
export function Squircle({
  radius = 24,
  className,
  style,
  children,
  ...rest
}: {
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const squircleStyle = {
    borderRadius: `${radius}px`,
    // @ts-expect-error corner-shape is not yet in the CSS typings
    cornerShape: `superellipse(${SQUIRCLE})`,
    ...style,
  } as CSSProperties;
  return (
    <div className={className} style={squircleStyle} {...rest}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run ui/Squircle && pnpm --filter @aspect/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/ui/Squircle.tsx apps/web/src/ui/Squircle.test.tsx
git commit -m "feat(web): add Squircle primitive (superellipse corners)"
```

---

## Task 4: Restyle Tile

The `Tile` API stays the same as Plan 3 plus optional `battery` and `wide` props, so callers (RoomSection) need only minor updates. It now takes a `path` (MDI) instead of an emoji `icon`.

**Files:** Modify `apps/web/src/ui/Tile.tsx`, `apps/web/src/ui/Tile.test.tsx`; Modify caller `apps/web/src/dashboard/RoomSection.tsx`

- [ ] **Step 1: Replace `apps/web/src/ui/Tile.tsx`**

```tsx
import { motion } from 'motion/react';
import type { ReactElement } from 'react';
import { Icon } from './Icon.js';
import { SQUIRCLE } from './tokens.js';

export interface TileProps {
  path: string;
  tint?: string | null;
  name: string;
  state: string;
  active: boolean;
  wide?: boolean;
  battery?: number | null;
  onPress: () => void;
}

export function Tile({
  path, tint, name, state, active, wide = false, battery = null, onPress,
}: TileProps): ReactElement {
  const sq = { borderRadius: '24px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  const chipSq = { borderRadius: '13px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  const low = battery !== null && battery <= 15;
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        'relative flex min-h-[120px] flex-col p-4 text-left font-[inherit] cursor-pointer',
        'border backdrop-blur-[22px]',
        wide ? 'col-span-2' : '',
        active
          ? 'bg-[#f6f7f9]/95 border-white/50 text-[#15161a]'
          : 'bg-[rgba(36,40,50,0.5)] border-white/10 text-[var(--color-text)]',
      ].join(' ')}
      style={sq}
    >
      {battery !== null && (
        <span className={`absolute right-3.5 top-3.5 text-[11px] font-semibold ${low ? 'text-[#ff8a8a]' : active ? 'text-[#7c8090]' : 'text-[rgba(235,238,245,0.55)]'}`}>
          {battery}%
        </span>
      )}
      <span
        className="flex h-[42px] w-[42px] items-center justify-center"
        style={{ ...chipSq, background: active ? '#191c24' : 'rgba(255,255,255,0.10)' }}
      >
        <Icon path={path} size={22} color={active ? '#fff' : (tint ?? '#dfe3ea')} />
      </span>
      <span className={`mt-auto text-[14px] font-bold tracking-[-0.2px] ${active ? 'text-[#15161a]' : ''}`}>{name}</span>
      <span className={`mt-0.5 text-[12px] font-medium ${active ? 'text-[#565a66]' : 'text-[var(--color-muted)]'}`}>{state}</span>
    </motion.button>
  );
}
```

- [ ] **Step 2: Update `apps/web/src/ui/Tile.test.tsx`** to the new props:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mdiLightbulb } from '@mdi/js';
import { Tile } from './Tile.js';

describe('Tile', () => {
  it('renders name, state, and an icon', () => {
    const { container } = render(
      <Tile path={mdiLightbulb} name="Kitchen Lamp" state="On · 80%" active onPress={() => {}} />,
    );
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.getByText('On · 80%')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('shows a battery percentage when provided', () => {
    render(<Tile path={mdiLightbulb} name="Sensor" state="OK" active={false} battery={9} onPress={() => {}} />);
    expect(screen.getByText('9%')).toBeInTheDocument();
  });
  it('calls onPress when clicked', async () => {
    const onPress = vi.fn();
    render(<Tile path={mdiLightbulb} name="Lamp" state="Off" active={false} onPress={onPress} />);
    await userEvent.click(screen.getByRole('button', { name: /lamp/i }));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Update the caller `apps/web/src/dashboard/RoomSection.tsx`** to pass `path`/`tint` instead of the emoji icon. Replace its `Tile` usage block:

```tsx
import { Tile } from '../ui/Tile.js';
import { formatState, isActive, domainOf } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import type { Room, RoomEntity } from './rooms.js';
import type { ReactElement } from 'react';

export interface RoomSectionProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomSection({ room, onSelect }: RoomSectionProps): ReactElement {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-[17px] font-bold tracking-[-0.3px]">{room.name}</h2>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            path={iconFor(re.entity)}
            tint={tintFor(domainOf(re.entity.entityId))}
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

- [ ] **Step 4: Run web tests, typecheck, build**

Run: `pnpm --filter @aspect/web test:run && pnpm --filter @aspect/web typecheck && pnpm --filter @aspect/web build`
Expected: all pass (Tile, RoomSection, Dashboard tests still green).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/Tile.tsx apps/web/src/ui/Tile.test.tsx apps/web/src/dashboard/RoomSection.tsx
git commit -m "feat(web): restyle Tile with squircle, MDI icon, frost-active, battery"
```

---

## Task 5: Sheet on Radix Dialog

Keep the same `Sheet` props (`open`, `onClose`, `title`, `children`) so `EntityDetailSheet` is unchanged. Radix gives focus trap, scroll lock, and a11y for free.

**Files:** Modify `apps/web/src/ui/Sheet.tsx`, `apps/web/src/ui/Sheet.test.tsx`. Add dep `@radix-ui/react-dialog`.

- [ ] **Step 1: Add dep.** `apps/web/package.json` deps: `"@radix-ui/react-dialog": "1.1.4"`. Run `pnpm install`.

- [ ] **Step 2: Replace `apps/web/src/ui/Sheet.tsx`**

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import type { ReactElement, ReactNode } from 'react';
import { SQUIRCLE } from './tokens.js';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps): ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[6px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-[520px] overflow-y-auto border border-white/10 bg-[rgba(28,30,38,0.85)] p-5 backdrop-blur-[28px]"
                style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', cornerShape: `superellipse(${SQUIRCLE})`, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' } as React.CSSProperties}
              >
                <div aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/20" />
                <Dialog.Title className="m-0 mb-3.5 text-[20px] font-bold">{title}</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Update `apps/web/src/ui/Sheet.test.tsx`** (Radix renders the title and content into a portal; queries still work):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sheet } from './Sheet.js';

describe('Sheet', () => {
  it('renders title and children when open', () => {
    render(<Sheet open onClose={() => {}} title="Kitchen Lamp"><p>Sheet body</p></Sheet>);
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
  });
  it('does not render content when closed', () => {
    render(<Sheet open={false} onClose={() => {}} title="Hidden"><p>Sheet body</p></Sheet>);
    expect(screen.queryByText('Sheet body')).not.toBeInTheDocument();
  });
  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<Sheet open onClose={onClose} title="X"><p>body</p></Sheet>);
    const { keyboard } = await import('@testing-library/user-event').then((m) => ({ keyboard: m.default.keyboard }));
    await keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run + typecheck + build**

Run: `pnpm --filter @aspect/web test:run ui/Sheet && pnpm --filter @aspect/web test:run dashboard/Dashboard && pnpm --filter @aspect/web typecheck`
Expected: PASS (Dashboard's "opens the detail sheet" test still finds the dialog by its accessible title).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/Sheet.tsx apps/web/src/ui/Sheet.test.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): reimplement Sheet on Radix Dialog"
```

---

## Task 6: Tabs, Slider, Switch, StatusPill primitives

**Files:** Create `apps/web/src/ui/Tabs.tsx`, `apps/web/src/ui/Tabs.test.tsx`, `apps/web/src/ui/Slider.tsx`, `apps/web/src/ui/Switch.tsx`, `apps/web/src/ui/StatusPill.tsx`. Add deps `@radix-ui/react-tabs`, `@radix-ui/react-slider`, `@radix-ui/react-switch`.

- [ ] **Step 1: Add deps.** `apps/web/package.json` deps: `"@radix-ui/react-tabs": "1.1.2"`, `"@radix-ui/react-slider": "1.2.2"`, `"@radix-ui/react-switch": "1.1.2"`. Run `pnpm install`.

- [ ] **Step 2: Create `apps/web/src/ui/Tabs.tsx`** (squircle tab bar)

```tsx
import * as RTabs from '@radix-ui/react-tabs';
import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon.js';
import { SQUIRCLE } from './tokens.js';

export interface TabItem { id: string; label: string; path: string; }

export function Tabs({
  items, value, onValueChange, children,
}: {
  items: TabItem[]; value: string; onValueChange: (v: string) => void; children: ReactNode;
}): ReactElement {
  const sq = { borderRadius: '16px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  return (
    <RTabs.Root value={value} onValueChange={onValueChange}>
      <RTabs.List className="-mx-5 mb-5 flex gap-[7px] overflow-x-auto px-5 pb-1">
        {items.map((t) => (
          <RTabs.Trigger
            key={t.id}
            value={t.id}
            style={sq}
            className="flex flex-none items-center gap-1.5 whitespace-nowrap border border-white/10 bg-[rgba(40,44,54,0.4)] px-[15px] py-[9px] text-[13px] font-semibold text-[var(--color-muted)] backdrop-blur-[14px] data-[state=active]:border-transparent data-[state=active]:bg-[rgba(244,245,247,0.95)] data-[state=active]:text-[#15161a]"
          >
            <Icon path={t.path} size={15} />
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}

export const TabPanel = RTabs.Content;
```

- [ ] **Step 3: Write `apps/web/src/ui/Tabs.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mdiSofaOutline } from '@mdi/js';
import { Tabs, TabPanel } from './Tabs.js';

describe('Tabs', () => {
  it('renders triggers and switches panels on click', async () => {
    const onChange = vi.fn();
    render(
      <Tabs value="a" onValueChange={onChange}
        items={[{ id: 'a', label: 'Alpha', path: mdiSofaOutline }, { id: 'b', label: 'Beta', path: mdiSofaOutline }]}>
        <TabPanel value="a">Panel A</TabPanel>
        <TabPanel value="b">Panel B</TabPanel>
      </Tabs>,
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /beta/i }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 4: Create `apps/web/src/ui/Slider.tsx`**

```tsx
import * as RSlider from '@radix-ui/react-slider';
import type { ReactElement } from 'react';

export function Slider({
  value, min = 0, max = 100, step = 1, onCommit, onValueChange, ariaLabel,
}: {
  value: number; min?: number; max?: number; step?: number;
  onCommit: (v: number) => void; onValueChange?: (v: number) => void; ariaLabel: string;
}): ReactElement {
  return (
    <RSlider.Root
      className="relative flex h-6 w-full touch-none items-center"
      value={[value]} min={min} max={max} step={step}
      onValueChange={(v) => onValueChange?.(v[0] ?? value)}
      onValueCommit={(v) => onCommit(v[0] ?? value)}
    >
      <RSlider.Track className="relative h-1.5 grow rounded-full bg-white/15">
        <RSlider.Range className="absolute h-full rounded-full bg-white/80" />
      </RSlider.Track>
      <RSlider.Thumb aria-label={ariaLabel} className="block h-5 w-5 rounded-full bg-white shadow-md focus:outline-none" />
    </RSlider.Root>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/ui/Switch.tsx`**

```tsx
import * as RSwitch from '@radix-ui/react-switch';
import type { ReactElement } from 'react';

export function Switch({
  checked, onCheckedChange, ariaLabel,
}: { checked: boolean; onCheckedChange: (v: boolean) => void; ariaLabel: string }): ReactElement {
  return (
    <RSwitch.Root
      checked={checked} onCheckedChange={onCheckedChange} aria-label={ariaLabel}
      className="relative h-7 w-12 rounded-full border border-white/10 bg-white/15 data-[state=checked]:bg-white/85"
    >
      <RSwitch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[#15161a]" />
    </RSwitch.Root>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/ui/StatusPill.tsx`**

```tsx
import type { ReactElement } from 'react';
import { Icon } from './Icon.js';
import { SQUIRCLE } from './tokens.js';

export function StatusPill({
  path, label, value, onClick,
}: { path: string; label: string; value: string; onClick?: () => void }): ReactElement {
  const sq = { borderRadius: '18px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  return (
    <button type="button" onClick={onClick} style={sq}
      className="flex flex-none items-center gap-2.5 border border-white/10 bg-[rgba(40,44,54,0.5)] px-[15px] py-2.5 text-left backdrop-blur-[18px]">
      <Icon path={path} size={18} />
      <span><b className="block text-[13px] font-bold">{label}</b><span className="block text-[11px] text-[var(--color-muted)]">{value}</span></span>
    </button>
  );
}
```

- [ ] **Step 7: Run + typecheck**

Run: `pnpm --filter @aspect/web test:run ui/Tabs && pnpm --filter @aspect/web typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/ui/Tabs.tsx apps/web/src/ui/Tabs.test.tsx apps/web/src/ui/Slider.tsx apps/web/src/ui/Switch.tsx apps/web/src/ui/StatusPill.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add Tabs, Slider, Switch, and StatusPill primitives"
```

---

## Task 7: Full verification

**Files:** none committed

- [ ] **Step 1: Whole workspace**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test:run && pnpm build`
Expected: every step exits 0; all tests pass.

- [ ] **Step 2: Visual smoke** (optional, against real HA): build + run the server as before and open the app — the existing room dashboard should now render with frosted squircle tiles, MDI icons, and the Plus Jakarta font. (Tabs/Slider/etc. are wired into screens in UI Plan 3.)

- [ ] **Step 3: Confirm clean tree** — `git status --short` empty.

---

## Definition of Done

- [ ] Tailwind v4 + Radix + MDI + Plus Jakarta are installed and building.
- [ ] `Squircle`, `Icon`/`iconFor`, restyled `Tile`, Radix `Sheet`, `Tabs`, `Slider`, `Switch`, `StatusPill` exist with tests.
- [ ] The current dashboard renders in the Frost/Apple language (frosted squircle tiles + MDI icons), all controls still work, and `pnpm typecheck`/`test:run`/`build` are green.

## Notes for the Next Plan (UI Plan 3 — App Shell + Room Tabs)

- Use `Tabs`/`TabPanel` for the Summary·Quick·rooms navigation; extend `rooms.ts` for balanced filtering (`entityCategory`/`hidden`/`disabled`) + battery-on-device grouping (pass `battery` to `Tile`).
- Swap the controls' raw range inputs for `Slider` and toggles for `Switch`; add a "Device info" section to `EntityDetailSheet`.
