import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from './connectionStore.js';
import type { EntityState } from '@aspect/shared';

const reset = (): void =>
  useConnectionStore.setState({
    link: 'disconnected',
    serverStatus: null,
    haConnected: false,
    entities: {},
    areas: [],
    devices: [],
    registry: [],
  });

const entity = (id: string, state: string): EntityState => ({
  entityId: id,
  state,
  attributes: {},
  lastChanged: 't',
  lastUpdated: 't',
});

describe('connectionStore', () => {
  beforeEach(reset);

  it('starts disconnected and empty', () => {
    const s = useConnectionStore.getState();
    expect(s.link).toBe('disconnected');
    expect(s.serverStatus).toBeNull();
    expect(s.areas).toEqual([]);
  });

  it('updates link and status', () => {
    useConnectionStore.getState().setLink('connected');
    useConnectionStore.getState().applyStatus('online', true);
    const s = useConnectionStore.getState();
    expect(s.link).toBe('connected');
    expect(s.serverStatus).toBe('online');
    expect(s.haConnected).toBe(true);
  });

  it('applies a snapshot keyed by entityId', () => {
    useConnectionStore.getState().applySnapshot({
      entities: [entity('light.a', 'on'), entity('light.b', 'off')],
      areas: [{ areaId: 'k', name: 'Kitchen' }],
      devices: [],
      registry: [],
    });
    const s = useConnectionStore.getState();
    expect(Object.keys(s.entities)).toHaveLength(2);
    expect(s.entities['light.a']?.state).toBe('on');
    expect(s.areas).toHaveLength(1);
  });

  it('applies entity updates and removals', () => {
    useConnectionStore.getState().applySnapshot({
      entities: [entity('light.a', 'on')],
      areas: [],
      devices: [],
      registry: [],
    });
    useConnectionStore.getState().applyEntityUpdate([entity('light.a', 'off')], []);
    expect(useConnectionStore.getState().entities['light.a']?.state).toBe('off');
    useConnectionStore.getState().applyEntityUpdate([], ['light.a']);
    expect(useConnectionStore.getState().entities['light.a']).toBeUndefined();
  });
});
