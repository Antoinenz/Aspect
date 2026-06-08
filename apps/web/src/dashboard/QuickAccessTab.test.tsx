import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAccessTab } from './QuickAccessTab.js';
import { useConnectionStore } from '../store/connectionStore.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, state = 'on'): EntityState => ({ entityId: id, state, attributes: {}, lastChanged: 't', lastUpdated: 't' });
const base = {
  link: 'connected' as const, serverStatus: 'online' as const, haConnected: true,
  entities: {} as Record<string, EntityState>, areas: [] as never[], devices: [] as never[],
  registry: [] as never[], favorites: [] as string[],
};

describe('QuickAccessTab', () => {
  beforeEach(() => useConnectionStore.setState({ ...base }));

  it('shows an empty state when there are no favorites', () => {
    render(<QuickAccessTab onSelect={() => {}} />);
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();
  });

  it('renders pinned favorites and opens one', async () => {
    const onSelect = vi.fn();
    useConnectionStore.setState({
      ...base,
      entities: { 'light.kitchen_lamp': e('light.kitchen_lamp'), 'scene.movie': e('scene.movie') },
      favorites: ['light.kitchen_lamp'],
    });
    render(<QuickAccessTab onSelect={onSelect} />);
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.queryByText('Movie')).not.toBeInTheDocument(); // not favorited
    await userEvent.click(screen.getByRole('button', { name: /kitchen lamp/i }));
    expect(onSelect).toHaveBeenCalledWith('light.kitchen_lamp');
  });
});
