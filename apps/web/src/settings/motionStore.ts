import { create } from 'zustand';
import { MotionGlobalConfig } from 'motion/react';

export type MotionPref = 'on' | 'off';
const KEY = 'aspect-motion';

export function loadMotion(): MotionPref {
  return localStorage.getItem(KEY) === 'off' ? 'off' : 'on';
}

export function applyMotion(pref: MotionPref): void {
  // MotionGlobalConfig.skipAnimations makes every Framer Motion animation
  // (page transitions, sidebar pill, tile presses, sheets, ...) complete
  // instantly — the CSS rules below only cover plain CSS keyframes/transitions.
  MotionGlobalConfig.skipAnimations = pref === 'off';
  if (pref === 'off') {
    document.documentElement.setAttribute('data-motion', 'reduced');
  } else {
    document.documentElement.removeAttribute('data-motion');
  }
}

export function initMotion(): void {
  applyMotion(loadMotion());
}

interface MotionState {
  motion: MotionPref;
  setMotion: (m: MotionPref) => void;
}

export const useMotionStore = create<MotionState>((set) => ({
  motion: loadMotion(),
  setMotion: (motion) => {
    localStorage.setItem(KEY, motion);
    applyMotion(motion);
    set({ motion });
  },
}));
