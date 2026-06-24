import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
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

function renderApp(initial = '/home'): ReactElement {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <App />
    </MemoryRouter>,
  ) as unknown as ReactElement;
}

describe('App', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows a loading skeleton before the link is up', () => {
    renderApp();
    // LoadingShell renders skeleton bones while connecting
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('hides the skeleton when fully connected', async () => {
    renderApp();
    act(() =>
      useConnectionStore.setState({
        ...base,
        link: 'connected',
        serverStatus: 'online',
        haConnected: true,
      }),
    );
    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  it('renders the nav shell when connected', async () => {
    act(() =>
      useConnectionStore.setState({
        ...base,
        link: 'connected',
        serverStatus: 'online',
        haConnected: true,
      }),
    );
    renderApp();
    await waitFor(() => {
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    });
  });
});
