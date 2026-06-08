/** Cover device_class values → shading / light-control category (blinds, curtains, etc.). */
export const SHADE_COVER_CLASSES = new Set([
  'blind', 'shade', 'curtain', 'awning', 'shutter', 'damper',
]);

/** Cover device_class values → security / access category (garage, gate, etc.). */
export const SECURITY_COVER_CLASSES = new Set(['door', 'garage', 'gate', 'window']);

/** Binary-sensor device_class values relevant to the security filter. */
export const SECURITY_BINARY_SENSOR_CLASSES = new Set([
  'door', 'window', 'opening', 'garage_door',
  'smoke', 'gas', 'moisture', 'carbon_monoxide', 'safety',
]);

/** Sensor device_class values relevant to the climate filter (environmental readings). */
export const CLIMATE_SENSOR_CLASSES = new Set(['temperature', 'humidity']);
