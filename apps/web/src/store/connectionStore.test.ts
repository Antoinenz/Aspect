import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from './connectionStore.js';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      link: 'disconnected',
      serverStatus: null,
      haConnected: false,
    });
  });

  it('starts disconnected with no server status', () => {
    const state = useConnectionStore.getState();
    expect(state.link).toBe('disconnected');
    expect(state.serverStatus).toBeNull();
  });

  it('updates link state', () => {
    useConnectionStore.getState().setLink('connected');
    expect(useConnectionStore.getState().link).toBe('connected');
  });

  it('applies a status message', () => {
    useConnectionStore.getState().applyStatus('online', true);
    const state = useConnectionStore.getState();
    expect(state.serverStatus).toBe('online');
    expect(state.haConnected).toBe(true);
  });
});
