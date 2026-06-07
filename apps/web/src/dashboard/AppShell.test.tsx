import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = { link: 'connected' as const, serverStatus: 'online' as const, haConnected: true, entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[], registry: [] as never[], favorites: [] as string[] };

describe('AppShell', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows Summary and Quick tabs plus a room tab', () => {
    act(() => useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
      areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
      registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
    }));
    render(<AppShell />);
    expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /kitchen/i })).toBeInTheDocument();
  });

  it('switches to a room tab and opens a tile sheet', async () => {
    act(() => useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp') },
      areas: [{ areaId: 'kitchen', name: 'Kitchen' }],
      registry: [{ entityId: 'light.kitchen_lamp', areaId: 'kitchen', deviceId: null, name: null, platform: 'demo', entityCategory: null, hidden: false, disabled: false, deviceClass: null }],
    }));
    render(<AppShell />);
    await userEvent.click(screen.getByRole('tab', { name: /kitchen/i }));
    await userEvent.click(screen.getByRole('button', { name: /kitchen lamp/i }));
    expect(await screen.findByRole('dialog', { name: /kitchen lamp/i })).toBeInTheDocument();
  });
});
