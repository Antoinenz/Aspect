import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Nav } from './Nav.js';

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('Nav', () => {
  it('renders all destinations and navigates on click', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Nav />
        <LocationProbe />
      </MemoryRouter>,
    );
    // Home appears in both sidebar and bottom bar; just assert at least one of each label exists.
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByText('Rooms')[0]!);
    expect(screen.getByTestId('location').textContent).toBe('/rooms');
  });
});
