import { create } from 'zustand';

const KEY = 'aspect-demo-mode';

interface DemoState {
  demo: boolean;
  setDemo: (value: boolean) => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  demo: localStorage.getItem(KEY) === 'true',
  setDemo: (value) => {
    localStorage.setItem(KEY, String(value));
    set({ demo: value });
  },
}));
