import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { SettingsPage } from './SettingsPage.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { useThemeStore } from './theme.js';
import { useMotionStore } from './motionStore.js';
import type { EntityState } from '@aspect/shared';

const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[],
  registry: [] as never[], favorites: [] as string[],
};

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderAt(path = '/settings'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-motion');
    useThemeStore.setState({ theme: 'auto' });
    useMotionStore.setState({ motion: 'on' });
    useConnectionStore.setState({ ...base });
  });

  it('switches the theme', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('shows the connected status', () => {
    renderAt();
    expect(screen.getByText(/connected to home assistant/i)).toBeInTheDocument();
  });

  it('shows a disconnected status', () => {
    useConnectionStore.setState({ ...base, link: 'disconnected', haConnected: false });
    renderAt();
    expect(screen.getByText(/^disconnected$/i)).toBeInTheDocument();
  });

  it('toggles motion to reduced', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: /reduced/i }));
    expect(useMotionStore.getState().motion).toBe('off');
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
  });

  it('shows the startup tab picker', () => {
    renderAt();
    expect(screen.getByText(/tab shown when you open aspect/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rooms/i })).toBeInTheDocument();
  });

  it('navigates to /admin when the server-administration link is clicked', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: /server administration/i }));
    expect(screen.getByTestId('location').textContent).toBe('/admin');
  });
});
