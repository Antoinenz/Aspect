import { describe, it, expect, beforeEach } from 'vitest';
import { handleRawMessage } from './messageHandler.js';
import { useConnectionStore } from '../store/connectionStore.js';
import {
  createStatusMessage,
  createSnapshotMessage,
  createEntityUpdateMessage,
  type EntityState,
} from '@aspect/shared';

const entity = (id: string, state: string): EntityState => ({
  entityId: id,
  state,
  attributes: {},
  lastChanged: 't',
  lastUpdated: 't',
});

describe('handleRawMessage', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      link: 'connected',
      serverStatus: null,
      haConnected: false,
      entities: {},
      areas: [],
      devices: [],
      registry: [],
    });
  });

  it('applies a status message', () => {
    handleRawMessage(JSON.stringify(createStatusMessage('degraded', true)));
    const s = useConnectionStore.getState();
    expect(s.serverStatus).toBe('degraded');
    expect(s.haConnected).toBe(true);
  });

  it('applies a snapshot message', () => {
    handleRawMessage(
      JSON.stringify(
        createSnapshotMessage({
          entities: [entity('light.a', 'on')],
          areas: [{ areaId: 'k', name: 'Kitchen' }],
          devices: [],
          registry: [],
        }),
      ),
    );
    expect(Object.keys(useConnectionStore.getState().entities)).toHaveLength(1);
  });

  it('applies an entity_update message', () => {
    handleRawMessage(
      JSON.stringify(createSnapshotMessage({
        entities: [entity('light.a', 'on')],
        areas: [],
        devices: [],
        registry: [],
      })),
    );
    handleRawMessage(JSON.stringify(createEntityUpdateMessage([entity('light.a', 'off')])));
    expect(useConnectionStore.getState().entities['light.a']?.state).toBe('off');
  });

  it('ignores invalid json and unknown messages without throwing', () => {
    expect(() => handleRawMessage('not json')).not.toThrow();
    handleRawMessage(JSON.stringify({ type: 'mystery' }));
    expect(useConnectionStore.getState().serverStatus).toBeNull();
  });
});
