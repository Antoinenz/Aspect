import type { ReactElement } from 'react';
import type { EntityState } from '@aspect/shared';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { ActionButton } from './ActionButton.js';
import { Slider } from '../ui/Slider.js';

export function LightControls({ entity }: { entity: EntityState }): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const isOn = entity.state === 'on';
  const id = entity.entityId;

  const brightness = typeof entity.attributes.brightness === 'number'
    ? Math.round(((entity.attributes.brightness as number) / 255) * 100)
    : isOn ? 100 : 0;

  const modes = Array.isArray(entity.attributes.supported_color_modes)
    ? (entity.attributes.supported_color_modes as string[])
    : [];
  const supportsBrightness =
    modes.some((m) => m !== 'onoff' && m !== 'unknown' && m !== 'none') ||
    'brightness' in entity.attributes;
  const supportsTemp = modes.includes('color_temp');
  const minK =
    typeof entity.attributes.min_color_temp_kelvin === 'number'
      ? entity.attributes.min_color_temp_kelvin
      : 2000;
  const maxK =
    typeof entity.attributes.max_color_temp_kelvin === 'number'
      ? entity.attributes.max_color_temp_kelvin
      : 6500;
  const curK = typeof entity.attributes.color_temp_kelvin === 'number'
    ? (entity.attributes.color_temp_kelvin as number)
    : Math.round((minK + maxK) / 2);

  const toggle = (): void => {
    optimistic(id, { state: isOn ? 'off' : 'on' });
    callService('light', isOn ? 'turn_off' : 'turn_on', id);
  };
  const setBrightness = (pct: number): void => {
    if (pct === 0) {
      optimistic(id, { state: 'off' });
      callService('light', 'turn_off', id);
    } else {
      optimistic(id, { state: 'on', attributes: { brightness: Math.round((pct / 100) * 255) } });
      callService('light', 'turn_on', id, { brightness_pct: pct });
    }
  };
  const setTemp = (k: number): void => {
    optimistic(id, { attributes: { color_temp_kelvin: k } });
    callService('light', 'turn_on', id, { color_temp_kelvin: k });
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ActionButton onClick={toggle} active={isOn}>{isOn ? 'Turn off' : 'Turn on'}</ActionButton>
      {supportsBrightness && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Brightness: {brightness}%
          <Slider ariaLabel="Brightness" value={brightness} min={0} max={100}
            onCommit={(v) => setBrightness(v)} />
        </label>
      )}
      {supportsTemp && (
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
          Warmth: {curK}K
          <Slider ariaLabel="Warmth" value={curK} min={minK} max={maxK} step={50}
            onCommit={(v) => setTemp(v)} />
        </label>
      )}
    </div>
  );
}
