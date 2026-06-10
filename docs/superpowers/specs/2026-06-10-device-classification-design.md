# Aspect — Device Classification (Kinds, Icons & Filtering) — Design

**Date:** 2026-06-10
**Status:** Approved (design phase)
**One-liner:** A single per-entity classifier (`classifyDevice`) that assigns a fine-grained `DeviceKind` (e.g. `pendant_light`, `extractor_fan`, `bedside_lamp`, `tv`, `motion_sensor`) using HA icon attributes, `device_class`, and name heuristics — driving both the icon shown for each tile and which filter pill (Lights/Climate/Security/Playing) it appears under.

---

## 1. Goals

- Replace today's coarse domain/`device_class`-only icon and filter logic with a richer per-entity **kind**, so tiles show the right icon (ceiling light vs pendant vs bedside lamp, TV vs speaker, extractor fan vs ceiling fan, etc.).
- Fix miscategorized entities — most concretely, **extractor/exhaust fans currently show under the Lights filter** when they belong under Climate.
- Surface **motion/occupancy/vibration sensors** under the Security filter (currently they appear in no filter pill at all).
- Detection should prefer **explicit signals** (an `icon` attribute that names the fixture exactly, or a `device_class` HA defines for the domain) before falling back to **name-based heuristics**.
- Scope is bounded to the domains Aspect already renders (`SUPPORTED_DOMAINS` + `media_player`) — depth within those domains, not new domains.

## 2. Detection algorithm

`classifyDevice(entity: EntityState): DeviceKind` runs an ordered, first-match-wins rule list per domain:

1. **Exact icon attribute** — `entity.attributes.icon` (e.g. `mdi:ceiling-light`, `mdi:floor-lamp`, `mdi:ceiling-fan`, `mdi:television`). A small lookup table (`iconAttr.ts`) maps known unambiguous mdi slugs straight to a `DeviceKind`. Only icons that are *specific* enough to imply a kind are listed (a generic `mdi:lightbulb` is not — it falls through).
2. **Exact `device_class`** — for domains where HA defines a meaningful one (`cover`, `binary_sensor`, `sensor`, `switch` outlet).
3. **Name heuristics** — ordered regexes against `friendly_name`, scoped per domain (e.g. for `light`: `/pendant/i` → `pendant_light`, `/bedside|nightstand/i` → `bedside_lamp`, `/ceiling/i` → `ceiling_light`, `/chandelier/i` → `chandelier`, etc.). For `fan` **and `switch`**: `/extract|exhaust|extractor/i` → `extractor_fan` — this is what fixes the extractor-fan-as-switch case.
4. **Domain fallback** — e.g. unmatched `light` → `light_generic`, unmatched `fan` → `fan_generic`.

`classifyDevice` takes only `EntityState` (matches today's `iconFor(entity)` signature) — `friendly_name` already reflects any registry name override, so no registry/device lookups are needed.

## 3. Kind taxonomy

Each kind maps to an icon and a filter bucket (`FilterKind | null`, reusing the existing `lights | climate | security | playing` from `filterView.ts`).

| Domain | Kinds | Filter |
|---|---|---|
| `light` | `ceiling_light`, `pendant_light`, `chandelier`, `wall_light`, `floor_lamp`, `desk_lamp`, `bedside_lamp`, `led_strip`, `spotlight`, `nightlight`, `light_generic` | `lights` |
| `fan` | `extractor_fan`, `ceiling_fan`, `pedestal_fan`, `air_purifier`, `fan_generic` | `climate` |
| `climate` | `thermostat`, `trv`, `climate_generic` | `climate` |
| `cover` (shading) | `blind`, `curtain`, `shutter`, `awning`, `damper`, `cover_generic` | `climate` |
| `cover` (access) | `garage_door`, `gate`, `door_cover`, `window_cover` | `security` |
| `lock` | `lock` | `security` |
| `sensor` (climate) | `temperature_sensor`, `humidity_sensor`, `co2_sensor`, `air_quality_sensor` | `climate` |
| `sensor` (other) | `power_sensor`, `energy_sensor`, `illuminance_sensor`, `pressure_sensor`, `sensor_generic` | none |
| `binary_sensor` | `motion_sensor`, `occupancy_sensor`, `vibration_sensor`, `door_sensor`, `window_sensor`, `smoke_sensor`, `gas_sensor`, `co_sensor`, `leak_sensor`, `safety_sensor`, `binary_sensor_generic` | `security` (generic → none) |
| `switch` | name-detected light-like → a `light` kind; name-detected `extractor_fan`; `device_class: 'outlet'` → `smart_plug`; else `switch_generic` | inherited from detected kind, else none |
| `media_player` | `tv`, `speaker`, `soundbar`, `receiver`, `media_generic` | `playing` |
| `scene` | `scene` | none |

`cover_generic` defaults to `climate` (covers are more often shading than access). Battery sensors continue to be filtered out before classification (unchanged — `rooms.ts` already excludes `device_class: 'battery'`).

Exact `@mdi/js` icon names per kind will be selected and verified against the installed package version during implementation (some candidates: `mdiCeilingLight`, `mdiFloorLamp`, `mdiDeskLamp`, `mdiWallSconce`, `mdiChandelier`, `mdiLedStrip`, `mdiCeilingFan`, `mdiAirPurifier`, `mdiTelevision`, `mdiSpeaker`, `mdiRadiator`).

## 4. Module structure

```
apps/web/src/domain/classify/
  types.ts        DeviceKind union (composed from per-category unions), Rule/ClassifyContext types
  iconAttr.ts      exact mdi-icon-slug -> DeviceKind map (step 1)
  lighting.ts      light domain: rules + icon map
  airAndClimate.ts fan + climate + shading covers + climate sensors: rules + icon map
  security.ts      lock + access covers + binary_sensors: rules + icon map
  media.ts         media_player: rules + icon map
  other.ts         switch + scene + non-climate sensors: rules + icon map
  index.ts         classifyDevice(), iconForKind(), filterCategoryForKind(), tintForKind()
```

Each category module exports its slice of the `DeviceKind` union, an ordered rule array, and an icon map. `index.ts` concatenates rule arrays in priority order (icon-attr rules first across all categories, then device_class rules, then name-heuristic rules, then domain fallbacks) and merges the icon maps.

`filterCategoryForKind(kind)` and `tintForKind(kind)` are small lookup tables in `index.ts`. Tint is derived generically from the filter bucket (lights→amber `#ffd27d`, climate→blue `#86c2ff`, security→green `#8ee6b0`, playing→`null`/neutral as today, none→`null`) rather than per-kind, avoiding ~40 redundant entries.

## 5. Integration with existing code

- **`apps/web/src/domain/icons.ts`**: `iconFor(entity)` becomes `iconForKind(classifyDevice(entity))`. `tintFor` changes signature from `(domain: string)` to `(entity: EntityState)`, deriving its result via `filterCategoryForKind(classifyDevice(entity))`. Update the ~5 call sites (`FilterPanel`, `QuickAccessTab` ×2, `RoomTab`, `SummaryTab`) to pass the entity instead of `domainOf(...)`/a hardcoded string.
- **`apps/web/src/dashboard/filterView.ts`**: `matchesFilter(re, kind)` becomes `filterCategoryForKind(classifyDevice(re.entity)) === kind`, replacing the current domain/`device_class` switch.
- **`apps/web/src/domain/deviceClass.ts`**: removed — its sets (`SHADE_COVER_CLASSES`, `SECURITY_COVER_CLASSES`, `SECURITY_BINARY_SENSOR_CLASSES`, `CLIMATE_SENSOR_CLASSES`) are absorbed into `airAndClimate.ts`/`security.ts` rules, expressed per-kind instead of per-bucket.
- **`apps/web/src/dashboard/rooms.ts`**: unchanged. Classification stays a pure per-entity function called where needed; entity counts per room are small enough that recomputing isn't a concern.

## 6. Testing

- One test file per category module (`lighting.test.ts`, `airAndClimate.test.ts`, `security.test.ts`, `media.test.ts`, `other.test.ts`) covering: icon-attribute match, `device_class` match, name-heuristic match (including the switch-named-"Extractor Fan" case), and domain fallback.
- Update `icons.test.ts` for the new `iconFor`/`tintFor` signatures.
- Update `filterView`/`SummaryTab` tests for the new bucket assignments — extractor fan → `climate`, motion sensor → `security`.

## 7. Decomposition into plans

This is small enough for a single implementation plan:

1. Build `domain/classify/*` (types, iconAttr, the 5 category modules, index) with tests.
2. Rewire `icons.ts` and `filterView.ts` to use it; remove `deviceClass.ts`.
3. Update call sites for the new `tintFor` signature and update affected tests.
