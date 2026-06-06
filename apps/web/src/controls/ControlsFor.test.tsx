import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ControlsFor } from './ControlsFor.js';
import type { EntityState } from '@aspect/shared';

vi.mock('../server-client/commands.js', () => ({ callService: vi.fn() }));

const e = (entityId: string, state = 'off', attributes: Record<string, unknown> = {}): EntityState => ({
  entityId, state, attributes, lastChanged: 't', lastUpdated: 't',
});

describe('ControlsFor', () => {
  it('renders light controls for a light', () => {
    render(<ControlsFor entity={e('light.k', 'off')} />);
    expect(screen.getByRole('button', { name: /turn on/i })).toBeInTheDocument();
  });

  it('renders an Activate button for a scene', () => {
    render(<ControlsFor entity={e('scene.movie')} />);
    expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
  });

  it('returns null for a read-only sensor', () => {
    const { container } = render(<ControlsFor entity={e('sensor.temp', '21')} />);
    expect(container).toBeEmptyDOMElement();
  });
});
