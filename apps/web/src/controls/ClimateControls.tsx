import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';

export function ClimateControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const id = entity.entityId;
  const target = typeof entity.attributes.temperature === 'number'
    ? (entity.attributes.temperature as number)
    : null;
  const step = typeof entity.attributes.target_temp_step === 'number'
    ? (entity.attributes.target_temp_step as number)
    : 0.5;
  const current = entity.attributes.current_temperature;
  const modes = Array.isArray(entity.attributes.hvac_modes)
    ? (entity.attributes.hvac_modes as string[])
    : [];

  const setTemp = (t: number): void => {
    optimistic(id, { attributes: { temperature: t } });
    callService('climate', 'set_temperature', id, { temperature: t });
  };
  const setMode = (mode: string): void => {
    optimistic(id, { state: mode });
    callService('climate', 'set_hvac_mode', id, { hvac_mode: mode });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {typeof current === 'number' && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Current: {current}°</p>
      )}
      {target !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActionButton onClick={() => setTemp(Number((target - step).toFixed(1)))}>−</ActionButton>
          <span style={{ fontSize: 22, fontWeight: 650, minWidth: 64, textAlign: 'center' }}>{target}°</span>
          <ActionButton onClick={() => setTemp(Number((target + step).toFixed(1)))}>+</ActionButton>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {modes.map((mode) => (
          <ActionButton key={mode} active={entity.state === mode} onClick={() => setMode(mode)}>
            {mode.replace(/_/g, ' ')}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}
