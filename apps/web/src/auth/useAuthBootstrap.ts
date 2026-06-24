import { useEffect } from 'react';
import { useAuthStore } from './authStore.js';
import { getMe, getAuthState } from './authApi.js';

/**
 * Runs once at app start: asks the server who we are (cookie-based) and
 * whether the server has any users at all. Drives the gate that decides
 * login vs signup.
 */
export function useAuthBootstrap(): void {
  const setStatus = useAuthStore((s) => s.setStatus);
  const setHasUsers = useAuthStore((s) => s.setHasUsers);

  useEffect(() => {
    void (async () => {
      try {
        const state = await getAuthState();
        setHasUsers(state.hasUsers);
      } catch { /* fall back to the default `true` so we don't auto-signup */ }
      try {
        const me = await getMe();
        if (me.user) setStatus('authenticated', me.user);
        else setStatus('anonymous', null);
      } catch {
        setStatus('anonymous', null);
      }
    })();
  }, [setStatus, setHasUsers]);
}
