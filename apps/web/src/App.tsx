import { useEffect, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { connectToServer } from './server-client/socket.js';
import { useConnectionStore } from './store/connectionStore.js';

export function App(): ReactElement {
  const link = useConnectionStore((s) => s.link);
  const serverStatus = useConnectionStore((s) => s.serverStatus);
  const haConnected = useConnectionStore((s) => s.haConnected);
  const entityCount = useConnectionStore((s) => Object.keys(s.entities).length);
  const areaCount = useConnectionStore((s) => s.areas.length);

  useEffect(() => connectToServer(), []);

  const connected = link === 'connected' && serverStatus !== null;
  const label = !connected ? 'Connecting…' : `Server ${serverStatus}`;
  const accent =
    serverStatus === 'online'
      ? '#3ddc84'
      : serverStatus === 'degraded'
        ? '#ffb84d'
        : '#8a8a93';

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#16161a',
        color: '#f3f3f5',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 22px',
              borderRadius: 999,
              background: '#1f1f25',
              border: '1px solid #2a2a31',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: accent }}
            />
            {label}
            {haConnected ? ' · HA linked' : ''}
          </motion.div>
        </AnimatePresence>

        {connected && (
          <p style={{ margin: 0, fontSize: 14, color: '#a9a7b3' }}>
            {entityCount} entities · {areaCount} areas
          </p>
        )}
      </div>
    </main>
  );
}
