import { create } from 'zustand';
import type { ServerStatus } from '@aspect/shared';

/** Whether the browser currently holds a socket to the Aspect server. */
export type LinkState = 'disconnected' | 'connecting' | 'connected';

interface ConnectionState {
  link: LinkState;
  serverStatus: ServerStatus | null;
  haConnected: boolean;
  setLink: (link: LinkState) => void;
  applyStatus: (status: ServerStatus, haConnected: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  link: 'disconnected',
  serverStatus: null,
  haConnected: false,
  setLink: (link) => set({ link }),
  applyStatus: (serverStatus, haConnected) => set({ serverStatus, haConnected }),
}));
