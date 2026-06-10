import { describe, it, expect } from 'vitest';
import { classifyDevice, iconForKind, filterCategoryForKind, tintForKind } from './index.js';
import type { EntityState } from '@aspect/shared';

const e = (id: string, attrs: Record<string, unknown> = {}): EntityState => ({
  entityId: id, state: 'on', attributes: attrs, lastChanged: 't', lastUpdated: 't',
});

describe('classifyDevice', () => {
  it('prefers an explicit icon attribute over name heuristics', () => {
    expect(classifyDevice(e('light.island', {
      icon: 'mdi:ceiling-light-multiple',
      friendly_name: 'Island Light',
    }))).toBe('pendant_light');
  });

  it('prefers device_class over name for shading covers', () => {
    expect(classifyDevice(e('cover.lounge', {
      device_class: 'blind',
      friendly_name: 'Lounge Curtain',
    }))).toBe('blind');
  });

  it('classifies a fan named "Extractor Fan" as extractor_fan in the climate bucket', () => {
    const kind = classifyDevice(e('fan.bathroom_extractor', { friendly_name: 'Extractor Fan' }));
    expect(kind).toBe('extractor_fan');
    expect(filterCategoryForKind(kind)).toBe('climate');
  });

  it('classifies a switch named "Extractor Fan" the same way', () => {
    const kind = classifyDevice(e('switch.bathroom_extractor', { friendly_name: 'Extractor Fan' }));
    expect(kind).toBe('extractor_fan');
    expect(filterCategoryForKind(kind)).toBe('climate');
  });

  it('classifies an outlet switch as a smart plug with no filter bucket', () => {
    const kind = classifyDevice(e('switch.lamp_plug', { device_class: 'outlet' }));
    expect(kind).toBe('smart_plug');
    expect(filterCategoryForKind(kind)).toBeNull();
  });

  it('classifies a motion binary_sensor under security', () => {
    const kind = classifyDevice(e('binary_sensor.hallway', { device_class: 'motion' }));
    expect(kind).toBe('motion_sensor');
    expect(filterCategoryForKind(kind)).toBe('security');
  });

  it('classifies an unmatched light as light_generic, lights bucket, amber tint', () => {
    const kind = classifyDevice(e('light.study', { friendly_name: 'Study' }));
    expect(kind).toBe('light_generic');
    expect(filterCategoryForKind(kind)).toBe('lights');
    expect(tintForKind(kind)).toBe('#ffd27d');
  });

  it('classifies a TV under the playing bucket with a null tint', () => {
    const kind = classifyDevice(e('media_player.living_room_tv', { friendly_name: 'Living Room TV' }));
    expect(kind).toBe('tv');
    expect(filterCategoryForKind(kind)).toBe('playing');
    expect(tintForKind(kind)).toBeNull();
  });

  it('falls back to sensor_generic with a non-empty icon for an unknown domain', () => {
    const kind = classifyDevice(e('mystery.x'));
    expect(kind).toBe('sensor_generic');
    expect(iconForKind(kind)).toBeTruthy();
  });

  it('lets a cover device_class win over a conflicting name pattern from another module', () => {
    // device_class 'garage' (security.ts) must win over the name "Blind"
    // (airAndClimate.ts), since all DEVICE_CLASS_RULES run before any
    // NAME_RULES regardless of module order.
    const kind = classifyDevice(e('cover.weird', { device_class: 'garage', friendly_name: 'Blind' }));
    expect(kind).toBe('garage_door');
    expect(filterCategoryForKind(kind)).toBe('security');
  });
});
