import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tile } from './Tile.js';

describe('Tile', () => {
  it('renders icon, name and state', () => {
    render(<Tile icon="💡" name="Kitchen Lamp" state="On · 80%" active onPress={() => {}} />);
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
    expect(screen.getByText('On · 80%')).toBeInTheDocument();
  });

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn();
    render(<Tile icon="💡" name="Lamp" state="Off" active={false} onPress={onPress} />);
    await userEvent.click(screen.getByRole('button', { name: /lamp/i }));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
