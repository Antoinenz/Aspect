import type { DeviceKind } from './types.js';

/**
 * HA `icon` attribute slugs (e.g. "mdi:ceiling-light") that unambiguously imply
 * a DeviceKind. Only specific icons are listed here — generic ones like
 * "mdi:lightbulb" or "mdi:fan" fall through to device_class/name heuristics.
 */
export const ICON_ATTR_KIND: Record<string, DeviceKind> = {
  // Lighting
  'mdi:ceiling-light': 'ceiling_light',
  'mdi:ceiling-light-multiple': 'pendant_light',
  'mdi:floor-lamp': 'floor_lamp',
  'mdi:desk-lamp': 'desk_lamp',
  'mdi:wall-sconce': 'wall_light',
  'mdi:wall-sconce-flat': 'wall_light',
  'mdi:chandelier': 'chandelier',
  'mdi:led-strip': 'led_strip',
  'mdi:led-strip-variant': 'led_strip',
  'mdi:lightbulb-night': 'nightlight',
  'mdi:lightbulb-night-outline': 'nightlight',
  'mdi:spotlight': 'spotlight',
  'mdi:spotlight-beam': 'spotlight',
  'mdi:track-light': 'spotlight',

  // Air & climate
  'mdi:ceiling-fan': 'ceiling_fan',
  'mdi:air-purifier': 'air_purifier',
  'mdi:thermostat': 'thermostat',
  'mdi:radiator': 'trv',
  'mdi:blinds': 'blind',
  'mdi:blinds-horizontal': 'blind',
  'mdi:blinds-vertical': 'blind',
  'mdi:curtains': 'curtain',
  'mdi:curtains-closed': 'curtain',
  'mdi:window-shutter': 'shutter',
  'mdi:window-shutter-open': 'shutter',
  'mdi:awning': 'awning',
  'mdi:awning-outline': 'awning',

  // Security
  'mdi:garage': 'garage_door',
  'mdi:garage-variant': 'garage_door',
  'mdi:gate': 'gate',
  'mdi:motion-sensor': 'motion_sensor',
  'mdi:vibrate': 'vibration_sensor',
  'mdi:smoke-detector': 'smoke_sensor',
  'mdi:smoke-detector-variant': 'smoke_sensor',
  'mdi:gas-cylinder': 'gas_sensor',
  'mdi:molecule-co': 'co_sensor',
  'mdi:molecule-co2': 'co2_sensor',
  'mdi:water-alert': 'leak_sensor',
  'mdi:shield-alert': 'safety_sensor',

  // Media
  'mdi:television': 'tv',
  'mdi:television-classic': 'tv',
  'mdi:soundbar': 'soundbar',
  'mdi:amplifier': 'receiver',
  'mdi:speaker': 'speaker',
  'mdi:speaker-wireless': 'speaker',

  // Other
  'mdi:power-plug': 'smart_plug',
  'mdi:power-socket': 'smart_plug',
};

export function classifyByIconAttr(icon: string | null): DeviceKind | null {
  if (!icon) return null;
  return ICON_ATTR_KIND[icon] ?? null;
}
