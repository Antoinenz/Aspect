import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence } from 'motion/react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { connectToServer } from './server-client/socket.js';
import { useConnectionStore } from './store/connectionStore.js';
import { useDemoStore } from './demo/demoStore.js';
import { useAuthStore } from './auth/authStore.js';
import { useAuthBootstrap } from './auth/useAuthBootstrap.js';
import { RequireAuth } from './auth/RequireAuth.js';
import { LoginPage } from './auth/LoginPage.js';
import { SignupPage } from './auth/SignupPage.js';
import { AppShell } from './dashboard/AppShell.js';
import { ErrorScreen } from './ui/ErrorScreen.js';
import { LoadingShell } from './ui/LoadingShell.js';

// Grace period before showing "server unreachable" — covers the initial
// connecting phase so we don't flash the error on a normal page load.
const SERVER_ERROR_DELAY_MS = 2000;
// If the socket is open but no status message arrives within this time,
// assume HA is unreachable rather than staying on loading forever.
const STATUS_TIMEOUT_MS = 4000;

function MainShell(): ReactElement {
  const link = useConnectionStore((s) => s.link);
  const serverStatus = useConnectionStore((s) => s.serverStatus);
  const haConnected = useConnectionStore((s) => s.haConnected);
  const demo = useDemoStore((s) => s.demo);
  const authStatus = useAuthStore((s) => s.status);
  const location = useLocation();

  // Bypass the loading/error gates when the user is on /admin. Without this,
  // a fresh install (no HA URL/token configured) would render ErrorScreen
  // forever — and the admin page is the very thing you need to fix that.
  const forceShell = location.pathname.startsWith('/admin');

  // Skip WebSocket in demo mode; connect only once authenticated. Logging
  // out triggers a disconnect via the cleanup return.
  useEffect(() => {
    if (demo) return;
    if (authStatus !== 'authenticated') return;
    return connectToServer();
  }, [demo, authStatus]);

  // HA is offline: server reachable but HA is not.
  const haOffline = !demo && link === 'connected' && serverStatus !== null && !haConnected;

  // Safety valve: if we're connected but haven't received any status message
  // within STATUS_TIMEOUT_MS, treat it as HA offline rather than loading forever.
  const [statusTimedOut, setStatusTimedOut] = useState(false);
  useEffect(() => {
    if (link !== 'connected' || serverStatus !== null) {
      setStatusTimedOut(false);
      return;
    }
    const t = setTimeout(() => setStatusTimedOut(true), STATUS_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [link, serverStatus]);

  // Server itself unreachable — show error only after grace period.
  const serverDown = !demo && link !== 'connected';
  const [serverTimedOut, setServerTimedOut] = useState(false);
  useEffect(() => {
    if (!serverDown) { setServerTimedOut(false); return; }
    const t = setTimeout(() => setServerTimedOut(true), SERVER_ERROR_DELAY_MS);
    return () => clearTimeout(t);
  }, [serverDown]);

  const rawShowError = haOffline || (!demo && statusTimedOut) || (serverDown && serverTimedOut);
  const errorKind = (haOffline || (!demo && statusTimedOut)) ? 'ha' : 'server';
  const showError = rawShowError && !(forceShell && errorKind === 'ha');
  const isLoading = !demo && !showError && !haConnected && !forceShell;

  return (
    <AnimatePresence mode="wait">
      {showError ? (
        <ErrorScreen key={errorKind} kind={errorKind} />
      ) : isLoading ? (
        <LoadingShell key="loading" />
      ) : (
        <div key="shell" className="shell-fade-in">
          <AppShell />
        </div>
      )}
    </AnimatePresence>
  );
}

export function App(): ReactElement {
  useAuthBootstrap();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <MainShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
