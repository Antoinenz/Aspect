import type { ReactElement } from 'react';
import { Tile } from '../ui/Tile.js';
import { domainIcon, formatState, isActive } from '../domain/entities.js';
import type { Room, RoomEntity } from './rooms.js';

export interface RoomSectionProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomSection({ room, onSelect }: RoomSectionProps): ReactElement {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 17,
          fontWeight: 650,
          letterSpacing: '-0.3px',
        }}
      >
        {room.name}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 13,
        }}
      >
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            icon={domainIcon(re.domain)}
            name={re.name}
            state={formatState(re.entity)}
            active={isActive(re.entity)}
            onPress={() => onSelect(re)}
          />
        ))}
      </div>
    </section>
  );
}
