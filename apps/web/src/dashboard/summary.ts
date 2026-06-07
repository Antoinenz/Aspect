import type { EntityState, RegistryEntry } from '@aspect/shared';
import { domainOf, friendlyName } from '../domain/entities.js';

export interface PersonStatus {
  entityId: string;
  name: string;
  home: boolean;
  picture: string | null;
}

export type AlertKind = 'open' | 'unlocked' | 'safety' | 'battery';

export interface SummaryAlert {
  entityId: string;
  name: string;
  kind: AlertKind;
  detail: string;
}

export interface SummaryData {
  climate: { count: number; range: string | null } | null;
  security: { locks: number; unlocked: number; openings: number } | null;
  playing: number;
  weather: { state: string; temp: string | null } | null;
  people: PersonStatus[];
  thermostats: string[];
  lightsOn: string[];
  alerts: SummaryAlert[];
}

const OPENING_CLASSES = new Set(['door', 'window', 'opening', 'garage_door']);
const SAFETY_CLASSES = new Set(['smoke', 'gas', 'moisture', 'carbon_monoxide']);
const BATTERY_LOW = 20;

export function buildSummary(
  entities: Record<string, EntityState>,
  registry: RegistryEntry[],
): SummaryData {
  const regName = new Map(registry.map((r) => [r.entityId, r.name] as const));
  const nameOf = (e: EntityState): string =>
    friendlyName(e, regName.get(e.entityId) ?? null);

  const thermostats: string[] = [];
  const targets: number[] = [];
  let locks = 0;
  let unlocked = 0;
  let openings = 0;
  let playing = 0;
  const people: PersonStatus[] = [];
  const lightsOn: string[] = [];
  const alerts: SummaryAlert[] = [];
  let weather: SummaryData['weather'] = null;

  for (const e of Object.values(entities)) {
    const dc = typeof e.attributes.device_class === 'string' ? e.attributes.device_class : null;
    switch (domainOf(e.entityId)) {
      case 'climate': {
        thermostats.push(e.entityId);
        if (typeof e.attributes.temperature === 'number') targets.push(e.attributes.temperature);
        break;
      }
      case 'lock':
        locks += 1;
        if (e.state === 'unlocked') {
          unlocked += 1;
          alerts.push({ entityId: e.entityId, name: nameOf(e), kind: 'unlocked', detail: 'Unlocked' });
        }
        break;
      case 'media_player':
        if (e.state === 'playing') playing += 1;
        break;
      case 'light':
        if (e.state === 'on') lightsOn.push(e.entityId);
        break;
      case 'person':
        people.push({
          entityId: e.entityId,
          name: nameOf(e),
          home: e.state === 'home',
          picture: typeof e.attributes.entity_picture === 'string' ? e.attributes.entity_picture : null,
        });
        break;
      case 'weather':
        if (!weather) {
          weather = {
            state: e.state,
            temp: typeof e.attributes.temperature === 'number' ? `${Math.round(e.attributes.temperature)}°` : null,
          };
        }
        break;
      case 'binary_sensor':
        if (dc && OPENING_CLASSES.has(dc) && e.state === 'on') {
          openings += 1;
          alerts.push({ entityId: e.entityId, name: nameOf(e), kind: 'open', detail: 'Open' });
        } else if (dc && SAFETY_CLASSES.has(dc) && e.state === 'on') {
          alerts.push({ entityId: e.entityId, name: nameOf(e), kind: 'safety', detail: dc.replace(/_/g, ' ') });
        }
        break;
      case 'sensor':
        if (dc === 'battery') {
          const n = Number(e.state);
          if (Number.isFinite(n) && n <= BATTERY_LOW) {
            alerts.push({ entityId: e.entityId, name: nameOf(e), kind: 'battery', detail: `${Math.round(n)}%` });
          }
        }
        break;
    }
  }

  const range =
    targets.length === 0
      ? null
      : Math.min(...targets) === Math.max(...targets)
        ? `${Math.min(...targets)}°`
        : `${Math.min(...targets)}–${Math.max(...targets)}°`;

  return {
    climate: thermostats.length ? { count: thermostats.length, range } : null,
    security: locks || openings ? { locks, unlocked, openings } : null,
    playing,
    weather,
    people,
    thermostats,
    lightsOn,
    alerts,
  };
}
