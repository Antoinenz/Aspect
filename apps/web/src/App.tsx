import { useEffect, useState, type ReactElement } from 'react';
import { connectToServer } from './server-client/socket.js';
import { useConnectionStore } from './store/connectionStore.js';
import { useDemoStore } from './demo/demoStore.js';
import { AppShell } from './dashboard/AppShell.js';
import { ErrorScreen } from './ui/ErrorScreen.js';

const ERROR_DELAY_MS = 2000;

export function App(): ReactElement {
  const link = useConnectionStore((s) => s.link);
  const serverStatus = useConnectionStore((s) => s.serverStatus);
  const haConnected = useConnectionStore((s) => s.haConnected);
  const demo = useDemoStore((s) => s.demo);

  // Skip WebSocket when in demo mode; reconnect when demo is turned off.
  useEffect(() => {
    if (demo) return;
    return connectToServer();
  }, [demo]);

  // Degrade gracefully — don't flash the error on initial connecting phase.
  const healthy =
    demo ||
    (link === 'connected' && haConnected) ||
    (link === 'connected' && serverStatus === 'degraded');

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (healthy) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), ERROR_DELAY_MS);
    return () => clearTimeout(t);
  }, [healthy]);

  if (!healthy && timedOut) {
    // Server reachable but HA explicitly offline → HA error with demo button.
    if (link === 'connected') return <ErrorScreen kind="ha" />;
    // Server unreachable → retrying indicator.
    return <ErrorScreen kind="server" />;
  }

  return <AppShell />;
}
