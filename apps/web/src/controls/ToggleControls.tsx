import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

const SERVICES: Record<string, { on: string; off: string; onState: string; offState: string }> = {
  switch: { on: 'turn_on', off: 'turn_off', onState: 'on', offState: 'off' },
  fan: { on: 'turn_on', off: 'turn_off', onState: 'on', offState: 'off' },
  lock: { on: 'unlock', off: 'lock', onState: 'unlocked', offState: 'locked' },
};

export function ToggleControls({ entity }: { entity: EntityState }): ReactElement {
  const domain = domainOf(entity.entityId);
  const cfg = SERVICES[domain] ?? SERVICES.switch!;
  const isOn = entity.state === cfg.onState;
  const optimistic = useConnectionStore((s) => s.applyOptimistic);

  const toggle = (): void => {
    const next = isOn ? cfg.off : cfg.on;
    optimistic(entity.entityId, { state: isOn ? cfg.offState : cfg.onState });
    callService(domain, next, entity.entityId);
  };

  const setPct = (pct: number): void => {
    optimistic(entity.entityId, { attributes: { percentage: pct } });
    callService('fan', 'set_percentage', entity.entityId, { percentage: pct });
  };

  const pct =
    typeof entity.attributes.percentage === 'number'
      ? (entity.attributes.percentage as number)
      : null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ActionButton onClick={toggle} active={isOn}>
        {isOn ? `Turn ${domain === 'lock' ? 'lock' : 'off'}` : `Turn ${domain === 'lock' ? 'unlock' : 'on'}`}
      </ActionButton>
      {domain === 'fan' && pct !== null && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Speed: {pct}%
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(ev) => setPct(Number(ev.target.value))}
          />
        </label>
      )}
    </div>
  );
}
