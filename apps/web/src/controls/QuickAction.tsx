import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function QuickAction({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const domain = domainOf(entity.entityId);
  const id = entity.entityId;

  if (domain === 'automation') {
    const isOn = entity.state === 'on';
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <ActionButton onClick={() => callService('automation', 'trigger', id)}>Run now</ActionButton>
        <ActionButton active={isOn} onClick={() => {
          optimistic(id, { state: isOn ? 'off' : 'on' });
          callService('automation', isOn ? 'turn_off' : 'turn_on', id);
        }}>
          {isOn ? 'Enabled' : 'Disabled'}
        </ActionButton>
      </div>
    );
  }

  const label = domain === 'scene' ? 'Activate' : domain === 'button' ? 'Press' : 'Run';
  const service = domain === 'button' ? 'press' : 'turn_on';
  return <ActionButton onClick={() => callService(domain, service, id)}>{label}</ActionButton>;
}
