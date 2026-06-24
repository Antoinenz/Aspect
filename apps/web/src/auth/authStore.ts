import { create } from 'zustand';
import type { AuthUser } from './types.js';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  /** Whether the server has any users at all (drives signup-vs-login flow). */
  hasUsers: boolean;
  user: AuthUser | null;
  setStatus(status: AuthStatus, user: AuthUser | null): void;
  setHasUsers(value: boolean): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  hasUsers: true,
  user: null,
  setStatus: (status, user) => set({ status, user }),
  setHasUsers: (value) => set({ hasUsers: value }),
}));
