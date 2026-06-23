import type { EntityState } from '@aspect/shared';

export type LightingKind =
  | 'ceiling_light'
  | 'pendant_light'
  | 'chandelier'
  | 'wall_light'
  | 'floor_lamp'
  | 'desk_lamp'
  | 'bedside_lamp'
  | 'led_strip'
  | 'spotlight'
  | 'nightlight'
  | 'light_generic';

export type AirClimateKind =
  | 'extractor_fan'
  | 'ceiling_fan'
  | 'pedestal_fan'
  | 'air_purifier'
  | 'fan_generic'
  | 'thermostat'
  | 'trv'
  | 'climate_generic'
  | 'blind'
  | 'curtain'
  | 'shutter'
  | 'awning'
  | 'damper'
  | 'cover_generic'
  | 'temperature_sensor'
  | 'humidity_sensor'
  | 'co2_sensor'
  | 'air_quality_sensor';

export type SecurityKind =
  | 'garage_door'
  | 'gate'
  | 'door_cover'
  | 'window_cover'
  | 'lock'
  | 'motion_sensor'
  | 'occupancy_sensor'
  | 'vibration_sensor'
  | 'door_sensor'
  | 'window_sensor'
  | 'smoke_sensor'
  | 'gas_sensor'
  | 'co_sensor'
  | 'leak_sensor'
  | 'safety_sensor'
  | 'binary_sensor_generic';

export type MediaKind = 'tv' | 'speaker' | 'soundbar' | 'receiver' | 'media_generic';

export type OtherKind =
  | 'smart_plug'
  | 'switch_generic'
  | 'scene'
  | 'power_sensor'
  | 'energy_sensor'
  | 'illuminance_sensor'
  | 'pressure_sensor'
  | 'sensor_generic';

export type DeviceKind = LightingKind | AirClimateKind | SecurityKind | MediaKind | OtherKind;

export type FilterKind = 'lights' | 'climate' | 'security' | 'playing';

/** Inputs the rule engine matches against — derived once per entity. */
export interface ClassifyContext {
  domain: string;
  deviceClass: string | null;
  /** Lowercased `friendly_name`, or `''` if absent. */
  name: string;
}

export interface Rule {
  kind: DeviceKind;
  test: (ctx: ClassifyContext) => boolean;
}

export function contextFor(
  entity: EntityState,
  domain: string,
  /** Registry-overridden device_class takes priority over the attribute value. */
  registryDeviceClass?: string | null,
): ClassifyContext {
  const dc = registryDeviceClass ?? entity.attributes.device_class;
  const fn = entity.attributes.friendly_name;
  return {
    domain,
    deviceClass: typeof dc === 'string' ? dc : null,
    name: typeof fn === 'string' ? fn.toLowerCase() : '',
  };
}
