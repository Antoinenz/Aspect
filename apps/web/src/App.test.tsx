import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { App } from './App.js';
import { useConnectionStore } from './store/connectionStore.js';
import { useAuthStore } from './auth/authStore.js';

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

beforeEach(() => {
  useConnectionStore.setState({ ...base });
  // Pretend the boot already completed — we'll exercise the gate via the
  // store directly. The bootstrap effect will overwrite this asynchronously
  // with whatever fetch returns; we stub that out below.
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/auth/state')) {
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ hasUsers: true }) } as Response;
    }
    if (url.includes('/api/auth/me')) {
      return {
        ok: true, status: 200, statusText: 'OK',
        json: async () => ({ user: { id: 'u1', username: 'admin', displayName: 'Admin', role: 'admin' } }),
      } as Response;
    }
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
  useAuthStore.setState({ status: 'authenticated', user: { id: 'u1', username: 'admin', displayName: 'Admin', role: 'admin' }, hasUsers: true });
});

describe('App', () => {
  it('shows a loading skeleton before the link is up', async () => {
    renderApp();
    // LoadingShell renders skeleton bones while connecting
    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
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

  it('renders the login page when the user is not authenticated', async () => {
    useAuthStore.setState({ status: 'anonymous', user: null, hasUsers: true });
    renderApp('/login');
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  it('renders the signup page when there are no users yet', async () => {
    useAuthStore.setState({ status: 'anonymous', user: null, hasUsers: false });
    renderApp('/signup');
    await waitFor(() => {
      expect(screen.getByText(/set up aspect/i)).toBeInTheDocument();
    });
  });
});
