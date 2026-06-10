<div align="center">

<img src="apps/web/public/logo.svg" width="112" height="112" alt="Aspect logo" />

# Aspect

**A gorgeous, responsive, open-source dashboard for Home Assistant.**

Apple Home–inspired polish, auto-organized by room, friendly enough for the whole family.

</div>

---

> [!NOTE]
> Aspect is in **active development** (pre-v1). The core — live control of your home through a beautiful, room-based UI, plus Home, Favourites, and Map tabs — works today. Friendly onboarding and one-click packaging are on the way (see [Roadmap](#roadmap)).

## What is Aspect?

Aspect is a modern front end for [Home Assistant](https://www.home-assistant.io/). Point it at your HA instance and it **auto-generates a calm, room-based dashboard** from your areas, devices, and entities — no YAML, no manual card-building. It's designed to look and feel like a first-party app: frosted "squircle" tiles, real Material Design icons, fluid spring motion, and a single warm signal for what's *active*.

A small server sits between your browser and Home Assistant, so **the HA token never leaves the server**, every device sees one consistent cached state, and your customizations sync everywhere.

## Features

- 🏠 **Auto-generated room dashboard** — areas become tabs; devices become tiles, instantly.
- 🎯 **Smart device classification** — every entity is automatically sorted into a device kind (lights, climate, security, media, locks, sensors, ...), powering the Lights / Climate / Security / Playing filter pills with zero configuration.
- 🎛️ **Real controls** — lights (brightness, color temperature), switches, scenes, covers (position), climate (setpoint & mode), fans, locks, media players (play/volume/source), scripts, automations, buttons, and helpers (select/number).
- ✨ **Polished, native feel** — Apple Home–inspired design language: frosted translucent squircle tiles, MDI icons, Plus Jakarta Sans, adaptive light/dark, reduced-motion aware (including all motion-based animations).
- 🔋 **Quiet by default** — diagnostic/config noise is filtered out; battery and secondary readings are attached to their device, not scattered as clutter.
- ⚡ **Live & responsive** — real-time state over WebSocket with optimistic updates; resilient reconnection.
- 🧭 **Home, Favourites & Map tabs** — a Home tab with an at-a-glance summary (presence, climate, alerts, recent activity), a Favourites tab for pinned devices/scenes (synced across every family device, server-stored), and a Map tab showing where family members are via device trackers.
- 🎨 **Personalize** — light/dark/auto theme and a built-in demo mode to try the full UI without a Home Assistant connection.
- 🔒 **Secure by design** — a single server-side connection to Home Assistant; clients never hold your HA token.

## Architecture

```
Family devices (PWA clients)  ──WS/HTTP──►  Aspect server  ──WS──►  Home Assistant
   phones · tablets · desktop                Node + SQLite            WebSocket API
```

- **`apps/server`** — Fastify server: the sole Home Assistant client. Connects via `home-assistant-js-websocket`, caches the entity/area/device registries and live state, fans them out to all clients, persists settings/favorites in SQLite, and forwards control commands to HA.
- **`apps/web`** — React + Vite PWA: connects only to the Aspect server. Renders the dashboard and controls.
- **`packages/shared`** — TypeScript types & WebSocket message contracts shared by both.

**Stack:** TypeScript · React 19 · Vite 6 · Tailwind CSS v4 · Radix UI · Motion · Leaflet · Material Design Icons · Zustand · Fastify 5 · better-sqlite3 · Node 22 · pnpm workspaces · Vitest.

## Getting started (development)

**Prerequisites:** Node 22+, [pnpm](https://pnpm.io/) 9+, and a running Home Assistant with a [long-lived access token](https://www.home-assistant.io/docs/authentication/#your-account-profile) (Profile → Security → Long-lived access tokens).

```bash
pnpm install

# Dev mode (web on :5173, proxying to the server on :8099)
pnpm dev
```

To run the **production build** against your real Home Assistant:

```bash
pnpm build

# PowerShell
$env:HA_URL="http://homeassistant.local:8123"; $env:HA_TOKEN="<your token>"; $env:ASPECT_WEB_DIR="apps/web/dist"; node apps/server/dist/server.js
# bash
HA_URL="http://homeassistant.local:8123" HA_TOKEN="<your token>" ASPECT_WEB_DIR="apps/web/dist" node apps/server/dist/server.js
```

Then open **http://127.0.0.1:8099**. Without `HA_URL`/`HA_TOKEN`, the server still runs (degraded mode) so you can see the UI shell.

### Configuration

| Env var          | Default          | Purpose                                            |
| ---------------- | ---------------- | -------------------------------------------------- |
| `HA_URL`         | _(none)_         | Home Assistant base URL, e.g. `http://host:8123`.  |
| `HA_TOKEN`       | _(none)_         | Long-lived access token (held server-side only).   |
| `PORT`           | `8099`           | Port the Aspect server listens on.                 |
| `HOST`           | `0.0.0.0`        | Bind interface.                                     |
| `ASPECT_WEB_DIR` | _(none)_         | Path to the built web assets to serve in prod.     |
| `ASPECT_DB`      | `data/aspect.db` | SQLite database file (favorites/settings).          |

### Handy commands

```bash
pnpm test:run     # run all tests (Vitest)
pnpm typecheck    # type-check every package
pnpm build        # build web + server

# Export your HA entities/attributes to home-export.json (diagnostics; gitignored)
HA_URL=... HA_TOKEN=... pnpm --filter @aspect/server dump:ha
```

## Roadmap

- [x] Server-as-hub: HA connection, cache, live fan-out
- [x] Per-domain device controls + command channel
- [x] Apple Home–inspired design system (Tailwind + Radix + MDI, squircles)
- [x] Tabbed app shell with auto-generated room tabs, filtering & battery-on-device
- [x] Smart device classification powering Lights/Climate/Security/Playing filters
- [x] Favorites persistence (SQLite, synced) + **Favourites** tab
- [x] **Home** tab (presence, climate/weather, alerts, activity)
- [x] **Map** tab — live location of family members via device trackers
- [ ] Friendly onboarding + "Log in with Home Assistant" (OAuth) and a service allow-list
- [ ] One-click install: Home Assistant add-on + Docker image
- [ ] Cameras, history charts, custom wallpaper, edit/reorder mode

## Contributing

Issues and PRs are welcome. Please run `pnpm typecheck && pnpm test:run && pnpm build` before opening a PR. The codebase follows TDD — add or update tests with your change.

## License

See [LICENSE](LICENSE).
