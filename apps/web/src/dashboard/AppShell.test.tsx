import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[],
  registry: [] as never[], favorites: [] as string[],
};

const withKitchen = () => useConnectionStore.setState({
  ...base,
  entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
  areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
  registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
});

describe('AppShell', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('renders the nav with Home and Settings', () => {
    render(<AppShell />);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

  it('navigates to Rooms overview, into a room, opens a tile, and back', async () => {
    render(<AppShell />);
    // AppShell's useEffect clears the store on mount when demo=false,
    // so set kitchen data after the initial effects have flushed.
    act(withKitchen);
    await userEvent.click(screen.getAllByText('Rooms')[0]!);
    // Overview shows the room card
    await userEvent.click(await screen.findByText('Kitchen'));
    // Room view shows the tile; open it
    await userEvent.click(await screen.findByRole('button', { name: 'Kitchen Lamp' }));
    expect(await screen.findByRole('dialog', { name: /kitchen lamp/i })).toBeInTheDocument();
  });

  it('shows the Map empty state when no one is located', async () => {
    render(<AppShell />);
    await userEvent.click(screen.getAllByText('Map')[0]!);
    expect(await screen.findByText(/no one with location sharing yet/i)).toBeInTheDocument();
  });
});
