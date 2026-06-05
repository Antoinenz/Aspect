import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from './App.js';
import { useConnectionStore } from './store/connectionStore.js';

// The App opens a socket on mount; stub it so jsdom doesn't try to connect.
vi.mock('./server-client/socket.js', () => ({
  connectToServer: () => () => undefined,
}));

describe('App', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      link: 'disconnected',
      serverStatus: null,
      haConnected: false,
    });
  });

  it('shows a connecting state before any status arrives', () => {
    render(<App />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('shows the server status once received', async () => {
    render(<App />);
    act(() => {
      useConnectionStore.getState().setLink('connected');
      useConnectionStore.getState().applyStatus('online', true);
    });
    expect(await screen.findByText(/online/i)).toBeInTheDocument();
  });
});
