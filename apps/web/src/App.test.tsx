import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { App } from './App.js';
import { useConnectionStore } from './store/connectionStore.js';

vi.mock('./server-client/socket.js', () => ({
  connectToServer: () => () => undefined,
}));

const base = {
  link: 'disconnected' as const,
  serverStatus: null,
  haConnected: false,
  entities: {},
  areas: [],
  devices: [],
  registry: [],
  favorites: [],
};

describe('App', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows a connecting badge before the link is up', () => {
    render(<App />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('hides the badge when fully healthy', async () => {
    render(<App />);
    act(() =>
      useConnectionStore.setState({
        ...base,
        link: 'connected',
        serverStatus: 'online',
        haConnected: true,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  });

  it('always renders the nav shell (Home nav item)', () => {
    render(<App />);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
  });
});
