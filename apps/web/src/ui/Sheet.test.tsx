import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet.js';

describe('Sheet', () => {
  it('renders title and children when open', () => {
    render(<Sheet open onClose={() => {}} title="Kitchen Lamp"><p>Sheet body</p></Sheet>);
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Lamp')).toBeInTheDocument();
  });
  it('does not render content when closed', () => {
    render(<Sheet open={false} onClose={() => {}} title="Hidden"><p>Sheet body</p></Sheet>);
    expect(screen.queryByText('Sheet body')).not.toBeInTheDocument();
  });
  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<Sheet open onClose={onClose} title="X"><p>body</p></Sheet>);
    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
