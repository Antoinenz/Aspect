import { type ReactElement } from 'react';
import { useConnectionStore } from '../store/connectionStore.js';
import { Tile } from '../ui/Tile.js';
import { iconFor, tintFor } from '../domain/icons.js';
import { formatState, isActive, friendlyName, domainOf } from '../domain/entities.js';

export function QuickAccessTab({ onSelect }: { onSelect: (entityId: string) => void }): ReactElement {
  const favorites = useConnectionStore((s) => s.favorites);
  const entities = useConnectionStore((s) => s.entities);

  const tiles = favorites
    .map((id) => entities[id])
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  if (tiles.length === 0) {
    return (
      <div className="grid gap-2">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Quick Access</h1>
        <p className="text-[15px] text-[var(--color-muted)]">
          No favorites yet. Open any device and tap the ☆ star to pin it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="m-0 mb-5 text-[26px] font-extrabold tracking-[-0.5px]">Quick Access</h1>
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {tiles.map((entity) => (
          <Tile
            key={entity.entityId}
            path={iconFor(entity)}
            tint={tintFor(domainOf(entity.entityId))}
            name={friendlyName(entity, null)}
            state={formatState(entity)}
            active={isActive(entity)}
            wide={domainOf(entity.entityId) === 'climate' || domainOf(entity.entityId) === 'media_player'}
            onPress={() => onSelect(entity.entityId)}
          />
        ))}
      </div>
    </div>
  );
}
