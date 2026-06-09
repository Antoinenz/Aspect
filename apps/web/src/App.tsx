import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { connectToServer } from './server-client/socket.js';
import { useConnectionStore } from './store/connectionStore.js';
import { useDemoStore } from './demo/demoStore.js';
import { AppShell } from './dashboard/AppShell.js';
import { ErrorScreen } from './ui/ErrorScreen.js';
import { LoadingShell } from './ui/LoadingShell.js';

// Grace period before showing "server unreachable" — covers the initial
// connecting phase so we don't flash the error on a normal page load.
const SERVER_ERROR_DELAY_MS = 2000;
// If the socket is open but no status message arrives within this time,
// assume HA is unreachable rather than staying on loading forever.
const STATUS_TIMEOUT_MS = 4000;

export function App(): ReactElement {
  const link = useConnectionStore((s) => s.link);
  const serverStatus = useConnectionStore((s) => s.serverStatus);
  const haConnected = useConnectionStore((s) => s.haConnected);
  const demo = useDemoStore((s) => s.demo);

  // Skip WebSocket in demo mode; reconnect immediately when demo is turned off.
  useEffect(() => {
    if (demo) return;
    return connectToServer();
  }, [demo]);

  // HA is offline: server reachable but HA is not.
  // Guard on serverStatus !== null so we wait for the first status message
  // before evaluating — avoids a false-positive before the server responds.
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

  const showError = haOffline || (!demo && statusTimedOut) || (serverDown && serverTimedOut);
  const errorKind = (haOffline || (!demo && statusTimedOut)) ? 'ha' : 'server';
  const isLoading = !demo && !showError && !haConnected;

  return (
    <AnimatePresence mode="wait">
      {showError ? (
        <ErrorScreen key={errorKind} kind={errorKind} />
      ) : isLoading ? (
        <LoadingShell key="loading" />
      ) : (
        <motion.div
          key="shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22 }}
        >
          <AppShell />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
