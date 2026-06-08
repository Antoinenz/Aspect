import type { ReactElement } from 'react';
import { Tile } from '../ui/Tile.js';
import { formatState, isActive, domainOf } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import type { Room, RoomEntity } from './rooms.js';

export interface RoomTabProps {
  room: Room;
  onSelect: (entity: RoomEntity) => void;
}

/** Display order and labels for domain groups. Domains in the same group share a heading. */
const GROUPS: { label: string; domains: string[] }[] = [
  { label: 'Lights', domains: ['light'] },
  { label: 'Climate', domains: ['climate'] },
  { label: 'Media', domains: ['media_player'] },
  { label: 'Blinds', domains: ['cover'] },
  { label: 'Fans', domains: ['fan'] },
  { label: 'Switches', domains: ['switch'] },
  { label: 'Locks', domains: ['lock'] },
  { label: 'Sensors', domains: ['binary_sensor', 'sensor'] },
  { label: 'Scenes', domains: ['scene'] },
  { label: 'Scripts', domains: ['script'] },
];

/** Any domain not listed above falls in here. */
const KNOWN_DOMAINS = new Set(GROUPS.flatMap((g) => g.domains));

function EntityGrid({ entities, onSelect }: { entities: RoomEntity[]; onSelect: (re: RoomEntity) => void }): ReactElement {
  return (
    <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
      {entities.map((re) => (
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
  );
}

export function RoomTab({ room, onSelect }: RoomTabProps): ReactElement {
  const byDomain = new Map<string, RoomEntity[]>();
  for (const re of room.entities) {
    const list = byDomain.get(re.domain);
    if (list) list.push(re);
    else byDomain.set(re.domain, [re]);
  }

  // Build ordered sections from GROUPS, then append any unlisted domains.
  const sections: { label: string; entities: RoomEntity[] }[] = [];
  for (const group of GROUPS) {
    const entities = group.domains.flatMap((d) => byDomain.get(d) ?? []);
    if (entities.length > 0) sections.push({ label: group.label, entities });
  }
  const otherEntities = room.entities.filter((re) => !KNOWN_DOMAINS.has(re.domain));
  if (otherEntities.length > 0) sections.push({ label: 'Other', entities: otherEntities });

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{room.name}</h1>
        <p className="mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
          {room.entities.length} accessories · {room.entities.filter((r) => isActive(r.entity)).length} active
        </p>
      </header>
      <div className="flex flex-col gap-7">
        {sections.map((s) => (
          <section key={s.label}>
            <h2 className="m-0 mb-3 text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">
              {s.label}
            </h2>
            <EntityGrid entities={s.entities} onSelect={onSelect} />
          </section>
        ))}
      </div>
    </div>
  );
}
