import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from './App.js';
import { useConnectionStore } from './store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

vi.mock('./server-client/socket.js', () => ({
  connectToServer: () => () => undefined,
}));

const entity = (id: string): EntityState => ({
  entityId: id,
  state: 'on',
  attributes: {},
  lastChanged: 't',
  lastUpdated: 't',
});

describe('App', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      link: 'disconnected',
      serverStatus: null,
      haConnected: false,
      entities: {},
      areas: [],
      devices: [],
      registry: [],
    });
  });

  it('shows a connecting state before any status arrives', () => {
    render(<App />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('shows status and live counts once received', async () => {
    render(<App />);
    act(() => {
      useConnectionStore.getState().setLink('connected');
      useConnectionStore.getState().applyStatus('online', true);
      useConnectionStore.getState().applySnapshot({
        entities: [entity('light.a'), entity('light.b')],
        areas: [{ areaId: 'k', name: 'Kitchen' }],
        devices: [],
        registry: [],
      });
    });
    expect(await screen.findByText(/online/i)).toBeInTheDocument();
    expect(screen.getByText(/2 entities/i)).toBeInTheDocument();
  });
});
