import type { ReactElement } from 'react';
import { Tile } from '../ui/Tile.js';
import { formatState, isActive, domainOf } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import type { Room, RoomEntity } from './rooms.js';

export interface RoomTabProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

export function RoomTab({ room, onSelect }: RoomTabProps): ReactElement {
  return (
    <div>
      <header className="mb-5">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{room.name}</h1>
        <p className="mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
          {room.entities.length} accessories · {room.entities.filter((r) => isActive(r.entity)).length} active
        </p>
      </header>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {room.entities.map((re) => (
          <Tile
            key={re.entity.entityId}
            path={iconFor(re.entity)}
            tint={tintFor(domainOf(re.entity.entityId))}
            name={re.name}
            state={formatState(re.entity)}
            active={isActive(re.entity)}
            wide={re.wide}
            battery={re.battery}
            onPress={() => onSelect(re)}
          />
        ))}
      </div>
    </div>
  );
}
