import {
  mdiPowerPlug, mdiToggleSwitchVariant, mdiPalette, mdiFlash, mdiLightningBolt,
  mdiBrightness5, mdiGauge, mdiThermometer,
} from '@mdi/js';
import { LIGHT_NAME_PATTERNS } from './lighting.js';
import { FAN_NAME_PATTERNS } from './airAndClimate.js';
import type { ClassifyContext, OtherKind, Rule } from './types.js';

const SENSOR_DEVICE_CLASS: Record<string, OtherKind> = {
  power: 'power_sensor',
  energy: 'energy_sensor',
  illuminance: 'illuminance_sensor',
  pressure: 'pressure_sensor',
  atmospheric_pressure: 'pressure_sensor',
};

export const DEVICE_CLASS_RULES: Rule[] = [
  { kind: 'smart_plug', test: (ctx) => ctx.domain === 'switch' && ctx.deviceClass === 'outlet' },
  ...Object.entries(SENSOR_DEVICE_CLASS).map(([dc, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'sensor' && ctx.deviceClass === dc,
  })),
];

export const NAME_RULES: Rule[] = [
  // Reuses airAndClimate's extractor_fan pattern: a switch named e.g. "extractor
  // fan" almost certainly controls a fan. Only extractor_fan is pulled in —
  // other FAN_NAME_PATTERNS kinds (ceiling/pedestal fan, air purifier) describe
  // standalone appliances, not switch-controlled fixtures.
  ...FAN_NAME_PATTERNS
    .filter(([, kind]) => kind === 'extractor_fan')
    .map(([re, kind]) => ({
      kind,
      test: (ctx: ClassifyContext) => ctx.domain === 'switch' && re.test(ctx.name),
    })),
  // Reuses all of lighting's name patterns: a switch named e.g. "bedside lamp"
  // controls that fixture. This assumes every current and future
  // LIGHT_NAME_PATTERNS entry names a physical light fixture (safe to match on
  // a switch); a non-fixture lighting pattern added later would need review here.
  ...LIGHT_NAME_PATTERNS.map(([re, kind]) => ({
    kind,
    test: (ctx: ClassifyContext) => ctx.domain === 'switch' && re.test(ctx.name),
  })),
];

export const FALLBACK_RULES: Rule[] = [
  { kind: 'switch_generic', test: (ctx) => ctx.domain === 'switch' },
  { kind: 'scene', test: (ctx) => ctx.domain === 'scene' },
  { kind: 'sensor_generic', test: (ctx) => ctx.domain === 'sensor' },
  { kind: 'sensor_generic', test: () => true },
];

export const ICONS: Record<OtherKind, string> = {
  smart_plug: mdiPowerPlug,
  switch_generic: mdiToggleSwitchVariant,
  scene: mdiPalette,
  power_sensor: mdiFlash,
  energy_sensor: mdiLightningBolt,
  illuminance_sensor: mdiBrightness5,
  pressure_sensor: mdiGauge,
  sensor_generic: mdiThermometer,
};
