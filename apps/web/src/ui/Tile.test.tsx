import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mdiLightbulb } from '@mdi/js';
import { Tile } from './Tile.js';

describe('Tile', () => {
  it('renders name, state, and an icon', () => {
    const { container } = render(
      <Tile path={mdiLightbulb} name="Kitchen Lamp" state="On · 80%" active onPress={() => {}} />,
    );
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.getByText('On · 80%')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows a battery percentage when provided', () => {
    render(<Tile path={mdiLightbulb} name="Sensor" state="OK" active={false} battery={9} onPress={() => {}} />);
    expect(screen.getByText('9%')).toBeInTheDocument();
  });

  it('calls onPress when the tile body is clicked', async () => {
    const onPress = vi.fn();
    render(<Tile path={mdiLightbulb} name="Lamp" state="Off" active={false} onPress={onPress} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lamp' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renders the icon as an action button and calls onAction when clicked', async () => {
    const onPress = vi.fn();
    const onAction = vi.fn();
    render(<Tile path={mdiLightbulb} name="Lamp" state="Off" active={false} onPress={onPress} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle Lamp' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the icon as a non-interactive span when onAction is absent', () => {
    render(<Tile path={mdiLightbulb} name="Lamp" state="Off" active={false} onPress={() => {}} />);
    expect(screen.queryByRole('button', { name: /toggle/i })).toBeNull();
    // Only the tile-body button
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
