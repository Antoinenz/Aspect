import type { EntityState } from '@aspect/shared';
import { domainOf } from '../entities.js';
import { classifyByIconAttr } from './iconAttr.js';
import * as lighting from './lighting.js';
import * as airAndClimate from './airAndClimate.js';
import * as security from './security.js';
import * as media from './media.js';
import * as other from './other.js';
import { contextFor } from './types.js';
import type { DeviceKind, FilterKind } from './types.js';

export type { DeviceKind, FilterKind } from './types.js';

const DEVICE_CLASS_RULES = [
  ...lighting.DEVICE_CLASS_RULES,
  ...airAndClimate.DEVICE_CLASS_RULES,
  ...security.DEVICE_CLASS_RULES,
  ...media.DEVICE_CLASS_RULES,
  ...other.DEVICE_CLASS_RULES,
];

const NAME_RULES = [
  ...lighting.NAME_RULES,
  ...airAndClimate.NAME_RULES,
  ...security.NAME_RULES,
  ...media.NAME_RULES,
  ...other.NAME_RULES,
];

const FALLBACK_RULES = [
  ...lighting.FALLBACK_RULES,
  ...airAndClimate.FALLBACK_RULES,
  ...security.FALLBACK_RULES,
  ...media.FALLBACK_RULES,
  ...other.FALLBACK_RULES,
];

const ALL_RULES = [...DEVICE_CLASS_RULES, ...NAME_RULES, ...FALLBACK_RULES];

const ICONS: Record<DeviceKind, string> = {
  ...lighting.ICONS,
  ...airAndClimate.ICONS,
  ...security.ICONS,
  ...media.ICONS,
  ...other.ICONS,
};

/**
 * Classifies an entity into a fine-grained DeviceKind.
 * Priority: explicit `icon` attribute → device_class → name heuristics → domain fallback.
 */
export function classifyDevice(entity: EntityState): DeviceKind {
  const icon = entity.attributes.icon;
  const fromIcon = classifyByIconAttr(typeof icon === 'string' ? icon : null);
  if (fromIcon) return fromIcon;

  const ctx = contextFor(entity, domainOf(entity.entityId));
  for (const rule of ALL_RULES) {
    if (rule.test(ctx)) return rule.kind;
  }
  return 'sensor_generic';
}

export function iconForKind(kind: DeviceKind): string {
  return ICONS[kind];
}

const FILTER_CATEGORY: Record<DeviceKind, FilterKind | null> = {
  // Lighting
  ceiling_light: 'lights', pendant_light: 'lights', chandelier: 'lights', wall_light: 'lights',
  floor_lamp: 'lights', desk_lamp: 'lights', bedside_lamp: 'lights', led_strip: 'lights',
  spotlight: 'lights', nightlight: 'lights', light_generic: 'lights',
  // Air & climate
  extractor_fan: 'climate', ceiling_fan: 'climate', pedestal_fan: 'climate', air_purifier: 'climate', fan_generic: 'climate',
  thermostat: 'climate', trv: 'climate', climate_generic: 'climate',
  blind: 'climate', curtain: 'climate', shutter: 'climate', awning: 'climate', damper: 'climate', cover_generic: 'climate',
  temperature_sensor: 'climate', humidity_sensor: 'climate', co2_sensor: 'climate', air_quality_sensor: 'climate',
  // Security
  garage_door: 'security', gate: 'security', door_cover: 'security', window_cover: 'security',
  lock: 'security',
  motion_sensor: 'security', occupancy_sensor: 'security', vibration_sensor: 'security',
  door_sensor: 'security', window_sensor: 'security', smoke_sensor: 'security', gas_sensor: 'security',
  co_sensor: 'security', leak_sensor: 'security', safety_sensor: 'security', binary_sensor_generic: null,
  // Media
  tv: 'playing', speaker: 'playing', soundbar: 'playing', receiver: 'playing', media_generic: 'playing',
  // Other
  smart_plug: null, switch_generic: null, scene: null,
  power_sensor: null, energy_sensor: null, illuminance_sensor: null, pressure_sensor: null, sensor_generic: null,
};

export function filterCategoryForKind(kind: DeviceKind): FilterKind | null {
  return FILTER_CATEGORY[kind];
}

const FILTER_TINT: Record<FilterKind, string | null> = {
  lights: '#ffd27d',
  climate: '#86c2ff',
  security: '#8ee6b0',
  playing: null,
};

export function tintForKind(kind: DeviceKind): string | null {
  const filter = filterCategoryForKind(kind);
  return filter ? FILTER_TINT[filter] : null;
}
