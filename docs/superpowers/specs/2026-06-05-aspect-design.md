# Aspect — Design Document

**Date:** 2026-06-05
**Status:** Approved (design phase)
**One-liner:** A gorgeous, installable Home Assistant dashboard that anyone in the family can use confidently.

---

## 1. Vision & Principles

Aspect is an open-source Home Assistant dashboard inspired by [ha-fusion](https://github.com/matt8707/ha-fusion), but modernized and polished to the standard of a first-party consumer app (the bar is "Apple Home–grade polish," not a clone of its exact style). It must be usable and reliable for every member of a household regardless of technical skill or age.

Four principles, in priority order. When they conflict, the higher one wins:

1. **Reliable** — it always reflects the true state of the home and never feels broken. Reliability beats features.
2. **Effortless** — works beautifully out of the box with near-zero setup; auto-organizes itself.
3. **Native, not "web"** — motion, gestures, and chrome that feel like a real installed app, not a website.
4. **Calm** — quiet, refined, high-contrast UI; warmth and color reserved for what is *active*.

## 2. Architecture

Aspect is a **frontend PWA + a small backend server**, distributed together. The server is the hub.

### Server-as-hub model

```
Family devices (PWA clients)  ──WS/HTTP──►  Aspect server  ──WS──►  Home Assistant
        (phones, tablets, desktop)            (Node + SQLite)         (WebSocket API)
```

- **The Aspect server is the ONLY thing that talks to Home Assistant.** Clients never connect to HA directly and never hold an HA token.
- The server owns the authoritative HA connection, caches the entity/area registry and live state, and fans state out to all connected clients over its own WebSocket.
- The server persists all settings/config in SQLite and exposes the sync API.

**Rationale:**
- *Security:* the HA long-lived/OAuth token stays server-side only.
- *Reliability:* one warm, cached, authoritative source of truth; clients get instant loads and consistent state.
- *Friendliness:* one HA connection regardless of how many family devices; sync is "free" because settings already live on the server.
- *Trade-off accepted:* the server sits on the realtime path. On a local network this latency is negligible and is worth the above benefits.

### Components

- **Backend** — Node + TypeScript, **Fastify** HTTP/WebSocket server. Connects to HA via the official `home-assistant-js-websocket` library. Persists to **SQLite** (single file, zero-config, easy to back up). One process, no external services.
- **Frontend** — React + TypeScript, built with **Vite**, animated with **Motion** (formerly Framer Motion). Installable **PWA** (standalone display, safe-area aware, offline app shell). Connects only to the Aspect server (single origin) for both realtime state and config. State held in a typed **Zustand** store fed by the server's WebSocket.
- **Shared** — a TypeScript package of types shared by server and web (entity shapes, config schema, WS message contracts).

## 3. Configuration & Sync

- All user customizations (favorites, ordering, hidden items, renames, theme preference) persist in the server's **SQLite** store.
- Settings **sync automatically** to every device: a change on one device is reflected on all others in realtime via the server.
- **Export/import** of config (JSON file) is supported for backups and for migrating between Aspect servers.

## 4. Authentication & Setup

Two-tier setup designed so the most common, least-technical users have the easiest path:

- **Home Assistant OS / Supervisor users (most people):** install Aspect from the **Home Assistant add-on store → open → done.** As a Supervisor add-on, Aspect receives an auto-provisioned HA token (`SUPERVISOR_TOKEN`), so there is effectively no configuration.
- **Docker / standalone users:** run the container, then authenticate via **"Log in with Home Assistant"** (HA's OAuth2 / IndieAuth flow). A manually-created long-lived access token is the fallback.

In all cases the token is held by the server only; clients authenticate to the Aspect server, not to HA.

## 5. Core Flows

- **Onboarding (≤ 4 steps):** connect to HA (auto for add-on users; address + login for standalone) → Aspect scans areas/devices/entities → "Here's your home" reveal. Target: under a minute.
- **Dashboard:** room-based and **auto-generated** from HA areas/devices/entities. A Home/overview surface with favorites, plus a section/tab per area. Glanceable tiles; **tap = quick toggle**, **tap-to-expand = detail sheet**.
- **Detail sheets:** tapping a tile slides a control sheet up over a blurred dashboard (light color/brightness/temp, thermostat dial, cover position). This is the signature "native depth" moment.
- **Edit / refine mode:** a clearly separated mode (never blocking normal use) to set favorites, drag-reorder, hide, and rename. Must be simple enough for a non-technical family member.

## 6. Visual & Motion System

- **Visual direction — the "calm blend":** near-monochrome adaptive light/dark base; a single warm accent reserved exclusively for "active" states; softly rounded (~17px) cards; generous spacing and a precise grid; tight, friendly typography on a system font stack. (Validated against mockups during brainstorming: a blend of restraint/whitespace with warmth/soft cards — explicitly *not* the loud, playful direction.)
- **Motion is the soul of the native feel:** spring physics (Motion), shared-element tile→sheet transitions, momentum scrolling, drag-to-reorder, and subtle haptic-style affordances. Implemented as a **small set of reusable motion primitives** so the feel stays consistent across the app and does not rely on hover.

## 7. v1 Scope

**In scope for v1:**
- Server-as-hub backend, SQLite persistence, auto-sync, export/import.
- Add-on and standalone setup paths with the two-tier auth.
- Auto-generated room dashboard; favorites, reorder, hide, rename.
- Adaptive light/dark; calm visual system; native motion primitives.
- Polished controls for these domains:
  - **lights** (on/off, brightness, color, color temperature)
  - **switches / outlets**
  - **climate / thermostats**
  - **covers / blinds**
  - **locks**
  - **fans**
  - **scenes**
  - **read-only sensors** (binary + numeric)

**Deferred to v1.x and beyond:**
- cameras, media players, history charts
- deep/manual card editing (canvas builder)
- multi-user roles/permissions
- custom theming beyond light/dark
- additional domains (vacuums, alarm panels, automations, etc.)

## 8. Reliability & Resilience

- **Server-side HA reconnect** with exponential backoff; the server keeps a warm cache so clients show last-known state with a clear "reconnecting" badge instead of breaking.
- **Optimistic control updates** on the client that reconcile against the server's authoritative state; clear rollback on failure.
- **Graceful "unavailable"** handling for offline entities.
- **Client reconnection** to the server is equally resilient (the same backoff + cached-state pattern).

## 9. Testing Strategy

- **TDD** for core logic: the HA entity/area mapping, the cache/state reconciliation, and the sync/config layer.
- **Unit tests** (Vitest) for server logic and shared types.
- **Component tests** for each domain control.
- **Mock HA WebSocket server** so the full stack can be developed and tested without a live Home Assistant instance — critical for contributor onboarding and CI.

## 10. Project Structure

Monorepo, organized so each unit has one clear purpose and a well-defined interface:

```
apps/
  server/            Fastify app
    ha/              HA connection, auth, reconnect, typed entity/area mappers
    cache/           authoritative state cache + reconciliation
    sync/            client WebSocket fan-out + config sync API
    db/              SQLite schema + migrations + repositories
  web/               React + Vite + Motion PWA
    server-client/   connection to Aspect server (state + config)
    store/           Zustand state
    dashboard/       auto-generation + layout
    controls/        one focused module per domain (light, climate, cover, ...)
    ui/              design-system primitives + motion primitives
    onboarding/      setup flow
packages/
  shared/            TS types shared by server & web (entities, config, WS contracts)
deploy/
  docker/            multi-arch Dockerfile
  ha-addon/          Home Assistant add-on manifest + config
```

## 11. Open Questions / Future Decisions

These are intentionally deferred and do not block v1 implementation planning:

- Exact OAuth2 client registration/redirect handling for standalone (non-add-on) deployments.
- Whether the server should expose a read-only "kiosk" mode for wall tablets (likely v1.x).
- Multi-arch build matrix specifics for the add-on (armv7/aarch64/amd64).
- Per-user (vs per-household) settings — v1 assumes a single shared household config.

---

## Decisions Log (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Integration model | Server + PWA clients (server-as-hub) | Security (token server-side), reliability (cached single source), friendliness (one HA connection, free sync) |
| Primary device | Responsive-first, all devices equally | No-compromise family use |
| Dashboard creation | Auto-generate, then refine (Apple Home style) | Effortless; key differentiator from ha-fusion's manual builder |
| Frontend framework | React + Vite + Motion | Best animation tooling for native feel; largest OSS contributor pool |
| Backend | Node + TypeScript + Fastify + SQLite | One language across stack; zero-config, reliable, self-host-friendly DB |
| Visual style | "Calm blend" (refined + warm), adaptive light/dark | User-selected blend of restraint and warmth; rejected the playful direction |
| v1 breadth | Focused, polished essentials | Polish & reliability over breadth |
