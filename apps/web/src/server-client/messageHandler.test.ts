import { describe, it, expect, beforeEach } from 'vitest';
import { handleRawMessage } from './messageHandler.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { createStatusMessage } from '@aspect/shared';

describe('handleRawMessage', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      link: 'connected',
      serverStatus: null,
      haConnected: false,
    });
  });

  it('applies a valid status message to the store', () => {
    handleRawMessage(JSON.stringify(createStatusMessage('degraded', true)));
    const state = useConnectionStore.getState();
    expect(state.serverStatus).toBe('degraded');
    expect(state.haConnected).toBe(true);
  });

  it('ignores invalid json without throwing', () => {
    expect(() => handleRawMessage('not json')).not.toThrow();
    expect(useConnectionStore.getState().serverStatus).toBeNull();
  });

  it('ignores well-formed json that is not a known message', () => {
    handleRawMessage(JSON.stringify({ type: 'mystery' }));
    expect(useConnectionStore.getState().serverStatus).toBeNull();
  });
});
