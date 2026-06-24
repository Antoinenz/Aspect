import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AppShell } from './AppShell.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { useDemoStore } from '../demo/demoStore.js';
import { useAuthStore } from '../auth/authStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[],
  registry: [] as never[], favorites: [] as string[],
};

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const withKitchen = (): void => useConnectionStore.setState({
  ...base,
  entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
  areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
  registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
});

describe('AppShell', () => {
  beforeEach(() => {
    useDemoStore.setState({ demo: false });
    useConnectionStore.setState({ ...base });
    // Seed an authenticated admin so RequireAuth lets /admin through.
    useAuthStore.setState({
      status: 'authenticated', hasUsers: true,
      user: { id: 'u1', username: 'admin', displayName: 'Admin', role: 'admin' },
    });
  });

  it('renders the nav with Home and Settings', () => {
    renderAt('/home');
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

  it('navigates from Rooms overview into a room (URL becomes /rooms/:areaId), opens a tile, and back', async () => {
    renderAt('/rooms');
    // AppShell's useEffect clears the store on mount when demo=false,
    // so set kitchen data after the initial effects have flushed.
    act(withKitchen);
    await userEvent.click(await screen.findByText('Kitchen'));
    expect(screen.getByTestId('location').textContent).toBe('/rooms/kitchen');
    await userEvent.click(await screen.findByRole('button', { name: 'Kitchen Lamp' }));
    expect(await screen.findByRole('dialog', { name: /kitchen lamp/i })).toBeInTheDocument();
  });

  it('shows the Map empty state when no one is located', async () => {
    renderAt('/map');
    expect(await screen.findByText(/no one with location sharing yet/i)).toBeInTheDocument();
  });

  it('renders the AdminPage when navigated to /admin', async () => {
    renderAt('/admin');
    expect(await screen.findByText(/server administration/i)).toBeInTheDocument();
  });

  it('redirects unknown paths to /home', () => {
    renderAt('/no-such-page');
    expect(screen.getByTestId('location').textContent).toBe('/home');
  });
});
