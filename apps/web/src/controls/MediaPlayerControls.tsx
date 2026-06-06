import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function MediaPlayerControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const title = typeof entity.attributes.media_title === 'string'
    ? (entity.attributes.media_title as string)
    : null;
  const volume = typeof entity.attributes.volume_level === 'number'
    ? Math.round((entity.attributes.volume_level as number) * 100)
    : null;
  const sources = Array.isArray(entity.attributes.source_list)
    ? (entity.attributes.source_list as string[])
    : [];
  const isPlaying = entity.state === 'playing';

  const cmd = (service: string): void => callService('media_player', service, id);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {title && <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => cmd('media_previous_track')}>⏮</ActionButton>
        <ActionButton active={isPlaying} onClick={() => {
          optimistic(id, { state: isPlaying ? 'paused' : 'playing' });
          cmd('media_play_pause');
        }}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </ActionButton>
        <ActionButton onClick={() => cmd('media_next_track')}>⏭</ActionButton>
      </div>
      {volume !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Volume: {volume}%
          <input type="range" min={0} max={100} value={volume}
            onChange={(ev) => {
              const v = Number(ev.target.value);
              optimistic(id, { attributes: { volume_level: v / 100 } });
              callService('media_player', 'volume_set', id, { volume_level: v / 100 });
            }} />
        </label>
      )}
      {sources.length > 0 && (
        <select
          value={typeof entity.attributes.source === 'string' ? (entity.attributes.source as string) : ''}
          onChange={(ev) => callService('media_player', 'select_source', id, { source: ev.target.value })}
          style={{ padding: 10, borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', font: 'inherit' }}
        >
          <option value="" disabled>Choose source…</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}
