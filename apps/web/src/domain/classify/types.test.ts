import { describe, it, expect } from 'vitest';
import { contextFor } from './types.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state: 'on', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

describe('contextFor', () => {
  it('extracts domain, device_class, and a lowercased name', () => {
    const ctx = contextFor(
      e('fan.bathroom_extractor', { friendly_name: 'Extractor Fan', device_class: 'fan' }),
      'fan',
    );
    expect(ctx).toEqual({ domain: 'fan', deviceClass: 'fan', name: 'extractor fan' });
  });

  it('defaults to an empty name and null device_class when absent', () => {
    const ctx = contextFor(e('light.k'), 'light');
    expect(ctx).toEqual({ domain: 'light', deviceClass: null, name: '' });
  });
});
