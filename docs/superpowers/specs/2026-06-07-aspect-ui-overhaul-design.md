# Aspect — Dashboard UI Overhaul (Apple Home–inspired) — Design

**Date:** 2026-06-07
**Status:** Approved (design phase)
**One-liner:** Replace the plain v1 dashboard with a polished, Apple Home–inspired interface: tabbed navigation (Summary · Quick Access · each room), a frosted-glass "squircle" design language, real device icons, noise filtering, and battery/diagnostics attached to their device.

This supersedes the visual layer of the Plan 3 dashboard. It builds on the live data, controls, and command channel already shipped (Plans 1–4).

---

## 1. Goals & Principles

- **Looks premium, not generic.** A cohesive, distinctive design language inspired by Apple Home — the opposite of flat emoji boxes.
- **Calm & neutral.** Dark, neutral surfaces; color reserved for device icons (subtle) and status (battery/alerts). "White = active."
- **Glanceable for the whole family.** Tabs make rooms one tap away; the Summary answers "is everything OK?" instantly.
- **Quiet by default.** Aggressively hide diagnostic/config noise; surface secondary data (battery) on the device it belongs to.
- **Functionality preserved.** All Plan 4 controls keep working; this is a presentation + navigation + small-persistence change.

## 2. Design Language ("Frost / Apple")

The validated visual system (approved via mockups):

- **Typeface:** Plus Jakarta Sans (400–800), system fallback. Bold, tight-tracked titles.
- **Icons:** Material Design Icons (`@mdi/js` paths + a small `Icon` wrapper) — the same family Home Assistant uses. No emoji. Icons are subtly colored by domain (warm for lights, blue for climate/covers/water, green for locks/security, neutral otherwise); on active (white) tiles icons turn dark.
- **Corners — squircles.** Continuous-curvature (superellipse) corners on every surface (tiles, chips, pills, tabs, sheet). Implementation: CSS `corner-shape: superellipse(~4)` where supported, with a cross-browser squircle fallback (SVG-mask/`figma-squircle`-style path, or a vetted squircle component) so iOS Safari (a primary PWA target) also gets true squircles. The slightly "square" curvature is intentional — it gives the UI its character.
- **Surfaces — frosted vibrancy.** Tiles are translucent dark (`rgba` ~0.5) with `backdrop-filter: blur(~22px) saturate(1.3)`, a 1px translucent white border, and a subtle inset top highlight, floating over a soft background.
- **Background.** A layered dark gradient (cool radial top-right + warm radial bottom-left over a near-black base). Tasteful, neutral, gives the vibrancy something to blur. (A user-set wallpaper is a possible future enhancement, out of scope here.)
- **Active state — "Frost".** Active/on devices (and the selected tab) become a near-white squircle with dark text and a dark icon chip — they literally "light up." Everything else stays calm and dark.
- **Status colors.** Low battery = red; alerts = red/amber. These are the only strong colors.
- **Adaptive light/dark.** Dark is the hero. Light mode: translucent light tiles over a light background, active tiles elevated/white with stronger shadow. Driven by `prefers-color-scheme`.
- **Motion.** Keep Motion (spring) for tile press, sheet slide-up, tab transitions, and tile enter; respect `prefers-reduced-motion`.

**Stack:** Tailwind CSS v4 (bespoke tokens — *not* default shadcn theme) + Radix UI headless primitives (Tabs, Dialog/Sheet, Slider, Tooltip, Switch) + `@mdi/js` icons + Motion. Tokens live in the Tailwind theme; primitives are wrapped in small `ui/` components.

## 3. Navigation & Structure

Top-level navigation is a **horizontal, scrollable, squircle tab bar**:

`Summary · Quick · <Room 1> · <Room 2> · … (alphabetical)`

- Tabs are frosted; the selected tab is Frost-white. Each tab has an MDI icon (room icon derived from the area, with a sensible default).
- Below the tabs, the selected tab's content scrolls. A small header shows the active tab's title (e.g. room name + "N accessories · M active") and an overflow (⋯) action.
- Responsive: the same structure works phone → desktop; tiles reflow via a responsive grid (`auto-fill, minmax`), with "wide" tiles spanning 2 columns.

## 4. Tabs

### 4.1 Summary
The "is everything OK / what's happening" glance, top to bottom:
- **Status pills** (frosted, horizontally scrollable, Apple-style): Climate (range across thermostats), Security (locks/doors summary), Playing (active media count). Tapping a pill jumps to the relevant detail/room.
- **Who's home** — compact presence cards for `person` entities (home/away, optional avatar from `entity_picture`).
- **Climate & weather** — current `weather` summary + each thermostat (temp/mode), as wide tiles.
- **Alerts & attention** — a list that appears only when something needs it: doors/windows open, locks unlocked, low batteries (≤ threshold), smoke/leak detected. Empty state: "All good."
- **Activity** — counts + quick-offs: "6 lights on" with a one-tap "turn all off", currently-playing media.

Each block renders only if it has content.

### 4.2 Quick Access
- User-**pinned favorites** (devices and scenes), rendered with the same tiles/controls as rooms.
- A **pin/unpin** affordance (star) available on any device — from the tile overflow and inside the detail sheet.
- Favorites **persist server-side** (SQLite) and **sync** to all devices in realtime (see §6).
- Empty state guides the user to pin their first items.

### 4.3 Room tabs
- One tab per Home Assistant area that has at least one visible entity (alphabetical).
- A responsive grid of tiles for that room's entities (after filtering, §5), with wide tiles for climate and media.
- Entities not assigned to any area are grouped into a trailing **"Other"** tab.

## 5. Filtering & Device Grouping ("balanced")

Driven by the entity registry, which the server must now expose more of.

**Hidden from room/quick views:**
- Entities with registry `entity_category` of `diagnostic` or `config` (the ~317 here).
- Entities with `hidden_by` or `disabled_by` set.
- Noise domains: `update`, `event`, `conversation`, `tts`, `stt`, `sun`, `zone`, `persistent_notification`, `device_tracker` (presence is shown in Summary, not as tiles), `person` (Summary only), `image`.

**Kept:** all controllable domains (Plan 4 set) + meaningful standalone sensors (e.g. temperature, humidity, power, motion, door/window, illuminance) + `media_player`.

**Battery & device grouping:**
- Sensors that are `diagnostic`/secondary but belong to a device (shared `device_id`) are **not** shown as their own tiles. Instead, **battery** (`device_class: battery`) for a device is shown as a small pill on that device's primary tile, and the full set of a device's secondary readings appears in that device's **detail sheet** under "Device info."
- A device's **primary entity** (the one that becomes the tile) is the most controllable/representative entity for that `device_id` (priority: light/climate/cover/lock/fan/switch/media_player > binary_sensor/sensor). Standalone sensors with no controllable sibling still appear as their own tiles.

## 6. Data & Persistence Changes

- **Registry fields (server + shared):** extend `RegistryEntry` to include `entityCategory` (`'config' | 'diagnostic' | null`), `hiddenBy`/`disabledBy` (boolean or source), and `deviceClass` (from the registry where available). Update `normalizeRegistryEntry` and the snapshot it sends. `device_class` for filtering/battery can also come from state attributes.
- **Favorites store (server):** SQLite (`better-sqlite3`) table of favorite entity IDs (household-shared for now). New shared messages: a `favorites` snapshot (server→client) and a `set_favorite`/`unset_favorite` command (client→server), reusing the Plan 4 channel pattern. Favorites broadcast to all clients on change.
- The room/grouping logic moves to a richer pure module that consumes entities + areas + devices + the extended registry and produces: visible rooms, per-room tiles (primary entities), and per-device secondary readings.

## 7. Components (units)

- `ui/theme` — Tailwind tokens (colors, blur, squircle radii, fonts).
- `ui/Squircle` — cross-browser squircle container (frosted fill + border).
- `ui/Icon` — MDI path renderer; `domain/iconFor(entity)` maps domain/device_class → MDI name + tint.
- `ui/Tile` — frosted squircle tile: icon chip, name, state, optional battery pill, active(Frost) variant, size variants (standard / wide), press → open sheet; optional quick-toggle.
- `ui/Sheet` — Radix Dialog as a bottom sheet (replaces the hand-rolled one); hosts Plan 4 controls + "Device info."
- `ui/Tabs` — Radix Tabs styled as the squircle tab bar.
- `ui/Slider`, `ui/Switch`, `ui/StatusPill` — Radix-based tactile controls (brightness/position/volume sliders replace raw range inputs).
- `dashboard/AppShell` — tab bar + active tab content.
- `dashboard/SummaryTab`, `QuickAccessTab`, `RoomTab` and their cards.
- `dashboard/rooms.ts` (extended) — filtering + device grouping (pure).
- `controls/*` — reused from Plan 4, restyled via the new primitives.

## 8. Out of Scope (future)

- User-uploaded wallpaper/background per home.
- Drag-to-reorder, hide/rename, multi-dashboard editing (the broader "edit mode").
- Per-user (vs household) favorites.
- Camera streams, history charts.
- The service-call ACL / WebSocket auth (tracked separately for the auth/onboarding plan).

## 9. Decomposition into Plans

This design is implemented across sequential plans, each shippable/green on its own:

1. **Data foundation** — extend registry fields (server + shared) + favorites SQLite store + favorites messages. (No UI yet; tested via mock HA + unit tests.)
2. **Design system** — Tailwind v4 + Radix setup, tokens, `Squircle`, `Icon` (MDI), `Tile`, `Sheet`, `Tabs`, `Slider`/`Switch`/`StatusPill`. Restyle existing controls.
3. **App shell + Room tabs** — tabbed navigation, extended room/grouping logic (filtering + battery-on-device), restyled room view + detail sheet with "Device info."
4. **Summary tab** — status pills, presence, climate/weather, alerts, activity.
5. **Quick Access** — pinned favorites UI + pin/unpin, wired to the favorites store.

## 10. Success Criteria

- The dashboard matches the approved Apple/Frost language (squircles, frosted tiles, MDI icons, Plus Jakarta, white-active) on real devices, light and dark.
- Tabs: Summary, Quick, and one tab per non-empty room (+ Other), responsive phone→desktop.
- Diagnostic/config noise is gone from rooms; battery shows on its device's tile; a device's secondary readings show in its sheet.
- Quick Access reflects pinned favorites and syncs across devices.
- All Plan 4 controls still work; tests, typecheck, and build stay green.

---

## Decisions Log (from this brainstorm)

| Decision | Choice |
|---|---|
| Navigation | Horizontal squircle tabs: Summary · Quick · rooms (+ Other) |
| Summary content | Status pills + presence + climate/weather + alerts + activity |
| Quick Access | User-pinned favorites, server-synced (SQLite) |
| Filtering | Balanced — hide diagnostic/config + noise domains + hidden/disabled |
| Battery/diagnostics | Attached to the device (pill on tile, full list in sheet) |
| Styling stack | Tailwind v4 + Radix primitives + `@mdi/js` + Motion |
| Visual language | Apple/"Frost": frosted translucent tiles, squircle (superellipse) corners, dark neutral gradient bg, Plus Jakarta Sans, subtly-colored icons, white = active |
