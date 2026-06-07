import { Tile } from '../ui/Tile.js';
import { formatState, isActive, domainOf } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import type { Room, RoomEntity } from './rooms.js';
import type { ReactElement } from 'react';

export interface RoomSectionProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomSection({ room, onSelect }: RoomSectionProps): ReactElement {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-[17px] font-bold tracking-[-0.3px]">{room.name}</h2>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            path={iconFor(re.entity)}
            tint={tintFor(domainOf(re.entity.entityId))}
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
