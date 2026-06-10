import {
  mdiAirFilter, mdiCeilingFan, mdiFan, mdiAirPurifier,
  mdiThermostat, mdiRadiator,
  mdiBlindsHorizontal, mdiCurtains, mdiWindowShutter, mdiAwning, mdiHvac,
  mdiThermometer, mdiWaterPercent, mdiMoleculeCo2, mdiQualityHigh,
} from '@mdi/js';
import type { AirClimateKind, ClassifyContext, Rule } from './types.js';

export const FAN_NAME_PATTERNS: ReadonlyArray<readonly [RegExp, AirClimateKind]> = [
  [/extract|exhaust/i, 'extractor_fan'],
  [/ceiling fan/i, 'ceiling_fan'],
  [/pedestal|tower fan|stand(ing)? fan/i, 'pedestal_fan'],
  [/purifier/i, 'air_purifier'],
];

const CLIMATE_NAME_PATTERNS: ReadonlyArray<readonly [RegExp, AirClimateKind]> = [
  [/trv|radiator|valve/i, 'trv'],
  [/thermostat/i, 'thermostat'],
];

const SHADE_COVER_DEVICE_CLASS: Record<string, AirClimateKind> = {
  blind: 'blind',
  shade: 'blind',
  curtain: 'curtain',
  awning: 'awning',
  shutter: 'shutter',
  damper: 'damper',
};

const COVER_NAME_PATTERNS: ReadonlyArray<readonly [RegExp, AirClimateKind]> = [
  [/blind/i, 'blind'],
  [/curtain/i, 'curtain'],
  [/shutter/i, 'shutter'],
  [/awning/i, 'awning'],
  [/damper/i, 'damper'],
];

const CLIMATE_SENSOR_DEVICE_CLASS: Record<string, AirClimateKind> = {
  temperature: 'temperature_sensor',
  humidity: 'humidity_sensor',
  carbon_dioxide: 'co2_sensor',
  aqi: 'air_quality_sensor',
  pm25: 'air_quality_sensor',
  pm10: 'air_quality_sensor',
  volatile_organic_compounds: 'air_quality_sensor',
  nitrogen_dioxide: 'air_quality_sensor',
};

export const DEVICE_CLASS_RULES: Rule[] = [
  ...Object.entries(SHADE_COVER_DEVICE_CLASS).map(([dc, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'cover' && ctx.deviceClass === dc,
  })),
  ...Object.entries(CLIMATE_SENSOR_DEVICE_CLASS).map(([dc, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'sensor' && ctx.deviceClass === dc,
  })),
];

export const NAME_RULES: Rule[] = [
  ...FAN_NAME_PATTERNS.map(([re, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'fan' && re.test(ctx.name),
  })),
  ...CLIMATE_NAME_PATTERNS.map(([re, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'climate' && re.test(ctx.name),
  })),
  ...COVER_NAME_PATTERNS.map(([re, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'cover' && re.test(ctx.name),
  })),
];

export const FALLBACK_RULES: Rule[] = [
  { kind: 'fan_generic', test: (ctx) => ctx.domain === 'fan' },
  { kind: 'climate_generic', test: (ctx) => ctx.domain === 'climate' },
  { kind: 'cover_generic', test: (ctx) => ctx.domain === 'cover' },
];

export const ICONS: Record<AirClimateKind, string> = {
  extractor_fan: mdiAirFilter,
  ceiling_fan: mdiCeilingFan,
  pedestal_fan: mdiFan,
  air_purifier: mdiAirPurifier,
  fan_generic: mdiFan,
  thermostat: mdiThermostat,
  trv: mdiRadiator,
  climate_generic: mdiThermostat,
  blind: mdiBlindsHorizontal,
  curtain: mdiCurtains,
  shutter: mdiWindowShutter,
  awning: mdiAwning,
  damper: mdiHvac,
  cover_generic: mdiBlindsHorizontal,
  temperature_sensor: mdiThermometer,
  humidity_sensor: mdiWaterPercent,
  co2_sensor: mdiMoleculeCo2,
  air_quality_sensor: mdiQualityHigh,
};
