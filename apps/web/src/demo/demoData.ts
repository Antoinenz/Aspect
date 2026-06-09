import type { Area, Device, EntityState, RegistryEntry } from '@aspect/shared';

const T = '2026-01-01T12:00:00Z';
const e = (
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): EntityState => ({ entityId, state, attributes, lastChanged: T, lastUpdated: T });

const reg = (
  entityId: string,
  areaId: string | null,
  opts: Partial<Pick<RegistryEntry, 'deviceId' | 'deviceClass' | 'entityCategory' | 'hidden' | 'disabled'>> = {},
): RegistryEntry => ({
  entityId,
  deviceId: opts.deviceId ?? null,
  areaId,
  name: null,
  platform: 'homeassistant',
  entityCategory: opts.entityCategory ?? null,
  hidden: opts.hidden ?? false,
  disabled: opts.disabled ?? false,
  deviceClass: opts.deviceClass ?? null,
});

export const DEMO_AREAS: Area[] = [
  { areaId: 'living_room',   name: 'Living Room' },
  { areaId: 'kitchen',       name: 'Kitchen' },
  { areaId: 'bedroom',       name: 'Bedroom' },
  { areaId: 'office',        name: 'Office' },
  { areaId: 'bathroom',      name: 'Bathroom' },
  { areaId: 'dining_room',   name: 'Dining Room' },
  { areaId: 'guest_bedroom', name: 'Guest Bedroom' },
  { areaId: 'garage',        name: 'Garage' },
];

export const DEMO_DEVICES: Device[] = [
  { deviceId: 'dev_tv_remote', name: 'TV Remote', areaId: 'living_room' },
];

const entityList: EntityState[] = [
  // ── Living Room ──────────────────────────────────────────────
  e('light.living_room_ceiling',        'on',      { friendly_name: 'Ceiling',       brightness: 180 }),
  e('light.living_room_floor_lamp',     'off',     { friendly_name: 'Floor Lamp' }),
  e('cover.living_room_blinds',         'open',    { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.living_room_temp',          '21',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('media_player.living_room_tv',      'playing', { friendly_name: 'TV',            media_title: 'The Bear', media_artist: 'FX' }),
  e('media_player.living_room_speaker', 'playing', { friendly_name: 'Speaker',       media_title: 'Sunny', media_artist: 'Bobby Hebb' }),
  e('climate.living_room_heatpump',     'heat',    { friendly_name: 'Heat Pump',     temperature: 22, current_temperature: 21 }),

  // ── Kitchen ──────────────────────────────────────────────────
  e('light.kitchen_ceiling',            'on',      { friendly_name: 'Ceiling',       brightness: 255 }),
  e('light.kitchen_under_cabinet',      'on',      { friendly_name: 'Under Cabinet', brightness: 128 }),
  e('cover.kitchen_blinds',             'open',    { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.kitchen_temp',              '22',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('switch.kitchen_coffee_maker',      'on',      { friendly_name: 'Coffee Maker' }),
  e('binary_sensor.kitchen_door',       'on',      { friendly_name: 'Back Door',     device_class: 'door' }),
  e('media_player.kitchen_speaker',     'playing', { friendly_name: 'Kitchen Speaker', media_title: 'Morning Mix', media_artist: 'Spotify' }),

  // ── Bedroom ──────────────────────────────────────────────────
  e('light.bedroom_ceiling',            'off',     { friendly_name: 'Ceiling' }),
  e('light.bedroom_bedside',            'on',      { friendly_name: 'Bedside',       brightness: 80 }),
  e('cover.bedroom_blinds',             'closed',  { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.bedroom_temp',              '19',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('climate.bedroom_ac',               'cool',    { friendly_name: 'AC',            temperature: 20, current_temperature: 19 }),
  e('media_player.bedroom_speaker',     'paused',  { friendly_name: 'Bedroom Speaker', media_title: 'Sleep Stories', media_artist: 'Calm' }),

  // ── Office ───────────────────────────────────────────────────
  e('light.office_desk_lamp',           'on',      { friendly_name: 'Desk Lamp',     brightness: 200 }),
  e('light.office_ceiling',             'off',     { friendly_name: 'Ceiling' }),
  e('cover.office_blinds',              'open',    { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.office_temp',               '23',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('switch.office_monitor',            'on',      { friendly_name: 'Monitor' }),

  // ── Bathroom ─────────────────────────────────────────────────
  e('light.bathroom_main',              'off',     { friendly_name: 'Main Light' }),
  e('sensor.bathroom_temp',             '24',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('sensor.bathroom_humidity',         '62',      { friendly_name: 'Humidity',      device_class: 'humidity',    unit_of_measurement: '%' }),
  e('fan.bathroom_extractor',           'on',      { friendly_name: 'Extractor Fan' }),

  // ── Dining Room ──────────────────────────────────────────────
  e('light.dining_room_ceiling',        'on',      { friendly_name: 'Ceiling',       brightness: 220 }),
  e('light.dining_room_pendant',        'on',      { friendly_name: 'Pendant',       brightness: 150 }),
  e('cover.dining_room_blinds',         'closed',  { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.dining_room_temp',          '21',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),
  e('media_player.dining_room_speaker', 'idle',    { friendly_name: 'Dining Speaker' }),
  e('climate.dining_room_heatpump',     'heat_cool', { friendly_name: 'Heat Pump',   temperature: 21, current_temperature: 20 }),

  // ── Guest Bedroom ─────────────────────────────────────────────
  e('light.guest_bedroom_ceiling',      'off',     { friendly_name: 'Ceiling' }),
  e('light.guest_bedroom_lamp',         'off',     { friendly_name: 'Bedside Lamp' }),
  e('cover.guest_bedroom_blinds',       'closed',  { friendly_name: 'Blinds',        device_class: 'blind' }),
  e('sensor.guest_bedroom_temp',        '20',      { friendly_name: 'Temperature',   device_class: 'temperature', unit_of_measurement: '°C' }),

  // ── Garage ───────────────────────────────────────────────────
  e('cover.garage',                     'closed',  { friendly_name: 'Garage Door',   device_class: 'garage' }),
  e('light.garage_main',                'off',     { friendly_name: 'Main Light' }),

  // ── Whole-home ───────────────────────────────────────────────
  e('lock.front_door',                  'unlocked',     { friendly_name: 'Front Door' }),
  e('person.alice',                     'home',         { friendly_name: 'Alice' }),
  e('person.bob',                       'not_home',     { friendly_name: 'Bob' }),
  e('weather.home',                     'partly_cloudy', { friendly_name: 'Home', temperature: 18 }),
  e('sensor.tv_remote_battery',         '14',      { friendly_name: 'TV Remote Battery', device_class: 'battery', unit_of_measurement: '%' }),
  e('sensor.porch_motion',              'unavailable', { friendly_name: 'Porch Motion' }),
];

export const DEMO_ENTITIES: Record<string, EntityState> = Object.fromEntries(
  entityList.map((en) => [en.entityId, en]),
);

export const DEMO_REGISTRY: RegistryEntry[] = [
  // Living Room
  reg('light.living_room_ceiling',        'living_room'),
  reg('light.living_room_floor_lamp',     'living_room'),
  reg('cover.living_room_blinds',         'living_room'),
  reg('sensor.living_room_temp',          'living_room'),
  reg('media_player.living_room_tv',      'living_room'),
  reg('media_player.living_room_speaker', 'living_room'),
  reg('climate.living_room_heatpump',     'living_room'),
  // Kitchen
  reg('light.kitchen_ceiling',            'kitchen'),
  reg('light.kitchen_under_cabinet',      'kitchen'),
  reg('cover.kitchen_blinds',             'kitchen'),
  reg('sensor.kitchen_temp',              'kitchen'),
  reg('switch.kitchen_coffee_maker',      'kitchen'),
  reg('binary_sensor.kitchen_door',       'kitchen'),
  reg('media_player.kitchen_speaker',     'kitchen'),
  // Bedroom
  reg('light.bedroom_ceiling',            'bedroom'),
  reg('light.bedroom_bedside',            'bedroom'),
  reg('cover.bedroom_blinds',             'bedroom'),
  reg('sensor.bedroom_temp',              'bedroom'),
  reg('climate.bedroom_ac',               'bedroom'),
  reg('media_player.bedroom_speaker',     'bedroom'),
  // Office
  reg('light.office_desk_lamp',           'office'),
  reg('light.office_ceiling',             'office'),
  reg('cover.office_blinds',              'office'),
  reg('sensor.office_temp',               'office'),
  reg('switch.office_monitor',            'office'),
  // Bathroom
  reg('light.bathroom_main',              'bathroom'),
  reg('sensor.bathroom_temp',             'bathroom'),
  reg('sensor.bathroom_humidity',         'bathroom'),
  reg('fan.bathroom_extractor',           'bathroom'),
  // Dining Room
  reg('light.dining_room_ceiling',        'dining_room'),
  reg('light.dining_room_pendant',        'dining_room'),
  reg('cover.dining_room_blinds',         'dining_room'),
  reg('sensor.dining_room_temp',          'dining_room'),
  reg('media_player.dining_room_speaker', 'dining_room'),
  reg('climate.dining_room_heatpump',     'dining_room'),
  // Guest Bedroom
  reg('light.guest_bedroom_ceiling',      'guest_bedroom'),
  reg('light.guest_bedroom_lamp',         'guest_bedroom'),
  reg('cover.guest_bedroom_blinds',       'guest_bedroom'),
  reg('sensor.guest_bedroom_temp',        'guest_bedroom'),
  // Garage
  reg('cover.garage',                     'garage'),
  reg('light.garage_main',                'garage'),
  // Whole-home (no area)
  reg('lock.front_door',                  null),
  reg('person.alice',                     null),
  reg('person.bob',                       null),
  reg('weather.home',                     null),
  reg('sensor.tv_remote_battery',         null, { deviceId: 'dev_tv_remote', deviceClass: 'battery' }),
  reg('sensor.porch_motion',              null),
];

export const DEMO_FAVORITES: string[] = [
  'light.living_room_ceiling',
  'switch.kitchen_coffee_maker',
  'climate.bedroom_ac',
  'light.office_desk_lamp',
  'climate.living_room_heatpump',
  'media_player.living_room_speaker',
];
