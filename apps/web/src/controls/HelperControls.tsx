import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';

export function HelperControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const domain = domainOf(entity.entityId);
  const id = entity.entityId;

  if (domain === 'select') {
    const options = Array.isArray(entity.attributes.options)
      ? (entity.attributes.options as string[])
      : [];
    return (
      <select
        value={entity.state}
        onChange={(ev) => {
          optimistic(id, { state: ev.target.value });
          callService('select', 'select_option', id, { option: ev.target.value });
        }}
        style={{ padding: 10, borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', font: 'inherit' }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  // number
  const min = typeof entity.attributes.min === 'number' ? entity.attributes.min : 0;
  const max = typeof entity.attributes.max === 'number' ? entity.attributes.max : 100;
  const step = typeof entity.attributes.step === 'number' ? entity.attributes.step : 1;
  const value = Number(entity.state);
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
      Value: {entity.state}
      <input type="range" min={min} max={max} step={step} value={Number.isNaN(value) ? min : value}
        onChange={(ev) => {
          optimistic(id, { state: ev.target.value });
          callService('number', 'set_value', id, { value: Number(ev.target.value) });
        }} />
    </label>
  );
}
