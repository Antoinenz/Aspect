// Diagnostic: connect to Home Assistant and export all entities, their
// attributes, and the area/device/entity registries to home-export.json.
// Run with HA_URL and HA_TOKEN set:
//   pnpm --filter @aspect/server dump:ha
// The output file is gitignored — it contains your home's data and stays local.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  createConnection,
  createLongLivedTokenAuth,
  getStates,
} from 'home-assistant-js-websocket';

const url = process.env.HA_URL;
const token = process.env.HA_TOKEN;
if (!url || !token) {
  console.error('Set HA_URL and HA_TOKEN environment variables first.');
  process.exit(1);
}

const auth = createLongLivedTokenAuth(url, token);
const connection = await createConnection({ auth });

const list = (type) => connection.sendMessagePromise({ type });

const [states, areas, devices, entityRegistry] = await Promise.all([
  getStates(connection),
  list('config/area_registry/list'),
  list('config/device_registry/list'),
  list('config/entity_registry/list'),
]);

// Per-domain summary: count + the union of attribute keys (with value types).
// This is the quickest way to verify which domains/attributes need support.
const byDomain = {};
for (const s of states) {
  const domain = s.entity_id.split('.')[0];
  byDomain[domain] ??= { count: 0, attributeTypes: {} };
  byDomain[domain].count += 1;
  for (const [k, v] of Object.entries(s.attributes ?? {})) {
    byDomain[domain].attributeTypes[k] = Array.isArray(v) ? 'array' : typeof v;
  }
}

const summary = Object.fromEntries(
  Object.entries(byDomain)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([domain, v]) => [
      domain,
      { count: v.count, attributeKeys: Object.keys(v.attributeTypes).sort() },
    ]),
);

const out = {
  generatedAt: new Date().toISOString(),
  counts: {
    entities: states.length,
    areas: areas.length,
    devices: devices.length,
    registry: entityRegistry.length,
  },
  summary,
  states,
  areas,
  devices,
  entityRegistry,
};

const outPath = path.resolve(process.cwd(), 'home-export.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  `Wrote ${states.length} entities across ${Object.keys(summary).length} domains to:\n${outPath}`,
);
connection.close();
process.exit(0);
