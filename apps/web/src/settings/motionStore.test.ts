import { describe, it, expect, beforeEach } from 'vitest';
import { MotionGlobalConfig } from 'motion/react';
import { applyMotion, loadMotion, useMotionStore } from './motionStore.js';

describe('motionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-motion');
    MotionGlobalConfig.skipAnimations = false;
    useMotionStore.setState({ motion: 'on' });
  });

  it('defaults to "on" with no stored preference', () => {
    expect(loadMotion()).toBe('on');
  });

  it('disables Framer Motion animations and sets data-motion when reduced', () => {
    applyMotion('off');
    expect(MotionGlobalConfig.skipAnimations).toBe(true);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
  });

  it('re-enables Framer Motion animations and clears data-motion when on', () => {
    applyMotion('off');
    applyMotion('on');
    expect(MotionGlobalConfig.skipAnimations).toBe(false);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });

  it('setMotion persists the preference and applies it', () => {
    useMotionStore.getState().setMotion('off');
    expect(localStorage.getItem('aspect-motion')).toBe('off');
    expect(MotionGlobalConfig.skipAnimations).toBe(true);
  });
});
