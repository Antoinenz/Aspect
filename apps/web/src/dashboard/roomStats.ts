import type { Room } from './rooms.js';

export interface RoomStat {
  areaId: string;
  name: string;
  deviceCount: number;
  onCount: number;
  openCount: number;
  temperature: string | null;
}

const NON_DEVICE_DOMAINS = new Set(['scene', 'script']);
const LIGHT_DOMAINS = new Set(['light', 'fan']);

export function roomsOverview(rooms: Room[]): RoomStat[] {
  const isDevice = (re: Room['entities'][number]): boolean =>
    !NON_DEVICE_DOMAINS.has(re.domain);

  return rooms.map((room) => {
    const tempSensor = room.entities.find(
      (re) => re.domain === 'sensor' && re.entity.attributes.device_class === 'temperature',
    );
    let temperature: string | null = null;
    if (tempSensor) {
      const n = Number(tempSensor.entity.state);
      if (Number.isFinite(n)) {
        const unit = typeof tempSensor.entity.attributes.unit_of_measurement === 'string'
          ? tempSensor.entity.attributes.unit_of_measurement
          : '°';
        temperature = `${Math.round(n)}${unit}`;
      }
    }

    return {
      areaId: room.areaId,
      name: room.name,
      deviceCount: room.entities.filter(isDevice).length,
      onCount: room.entities.filter((re) => LIGHT_DOMAINS.has(re.domain) && re.entity.state === 'on').length,
      openCount: room.entities.filter((re) => re.domain === 'cover' && re.entity.state === 'open').length,
      temperature,
    };
  });
}
