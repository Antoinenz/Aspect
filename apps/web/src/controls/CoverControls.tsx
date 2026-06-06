import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function CoverControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const position = typeof entity.attributes.current_position === 'number'
    ? (entity.attributes.current_position as number)
    : null;

  const act = (service: string, state: string): void => {
    optimistic(id, { state });
    callService('cover', service, id);
  };
  const setPosition = (pos: number): void => {
    optimistic(id, { attributes: { current_position: pos }, state: pos > 0 ? 'open' : 'closed' });
    callService('cover', 'set_cover_position', id, { position: pos });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => act('open_cover', 'open')}>Open</ActionButton>
        <ActionButton onClick={() => act('stop_cover', entity.state)}>Stop</ActionButton>
        <ActionButton onClick={() => act('close_cover', 'closed')}>Close</ActionButton>
      </div>
      {position !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Position: {position}%
          <input type="range" min={0} max={100} value={position}
            onChange={(ev) => setPosition(Number(ev.target.value))} />
        </label>
      )}
    </div>
  );
}
