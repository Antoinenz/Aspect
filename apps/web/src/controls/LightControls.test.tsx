import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LightControls } from './LightControls.js';
import type { EntityState } from '@aspect/shared';

const sent: unknown[] = [];
vi.mock('../server-client/commands.js', () => ({
  callService: (...args: unknown[]) => sent.push(args),
}));

const light = (state: string, attributes: Record<string, unknown> = {}): EntityState => ({
  entityId: 'light.kitchen',
  state,
  attributes,
  lastChanged: 't',
  lastUpdated: 't',
});

describe('LightControls', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('turns a light on when off', async () => {
    render(<LightControls entity={light('off')} />);
    await userEvent.click(screen.getByRole('button', { name: /turn on/i }));
    expect(sent[0]).toEqual(['light', 'turn_on', 'light.kitchen']);
  });

  it('shows a brightness slider when supported', () => {
    render(<LightControls entity={light('on', { brightness: 128, supported_color_modes: ['brightness'] })} />);
    expect(screen.getByText(/brightness/i)).toBeInTheDocument();
  });
});
