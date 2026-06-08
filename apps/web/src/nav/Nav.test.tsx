import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Nav } from './Nav.js';

describe('Nav', () => {
  it('renders all destinations and fires onNavigate', async () => {
    const onNavigate = vi.fn();
    render(<Nav section="home" onNavigate={onNavigate} />);
    // Home appears in both sidebar and bottom bar; just assert at least one of each label exists.
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByText('Rooms')[0]!);
    expect(onNavigate).toHaveBeenCalledWith('rooms');
  });
});
