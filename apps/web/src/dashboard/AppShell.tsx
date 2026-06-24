import { useMemo, useRef, useEffect, useLayoutEffect, useState, type ReactElement } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useConnectionStore } from '../store/connectionStore.js';
import { useDemoStore } from '../demo/demoStore.js';
import { DEMO_ENTITIES, DEMO_AREAS, DEMO_DEVICES, DEMO_REGISTRY, DEMO_FAVORITES } from '../demo/demoData.js';
import { Nav } from '../nav/Nav.js';
import { pageRank } from '../nav/navItems.js';
import { buildRooms, type Room } from './rooms.js';
import { SummaryTab } from './SummaryTab.js';
import { QuickAccessTab } from './QuickAccessTab.js';
import { RoomsOverview } from './RoomsGrid.js';
import { RoomView } from './RoomView.js';
import { EntityDetailSheet } from './EntityDetailSheet.js';
import { SettingsPage } from '../settings/SettingsPage.js';
import { AdminPage } from '../admin/AdminPage.js';
import { MapPage } from '../map/MapPage.js';

/**
 * Resolve the user's preferred startup path from localStorage. The picker in
 * Settings still writes the old Section ID, so map it here.
 */
function startupPath(): string {
  const saved = localStorage.getItem('aspect-startup-section');
  switch (saved) {
    case 'favorites': return '/favourites';
    case 'rooms': return '/rooms';
    case 'map': return '/map';
    case 'home':
    default: return '/home';
  }
}

/** Inner route for /rooms/:areaId — looks the room up by URL param. */
function RoomRoute({ rooms, onSelect }: {
  rooms: Room[]; onSelect: (id: string) => void;
}): ReactElement {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const room = rooms.find((r) => r.areaId === areaId) ?? null;
  if (!room) return <Navigate to="/rooms" replace />;
  return (
    <RoomView
      room={room}
      onBack={() => navigate('/rooms')}
      onSelect={(re) => onSelect(re.entity.entityId)}
    />
  );
}

export function AppShell(): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const areas = useConnectionStore((s) => s.areas);
  const devices = useConnectionStore((s) => s.devices);
  const registry = useConnectionStore((s) => s.registry);
  const demo = useDemoStore((s) => s.demo);
  const location = useLocation();
  const navigate = useNavigate();

  // Track previous demo value so we only reset the store when transitioning
  // FROM demo mode. Running the reset on every initial mount (demo=false) would
  // immediately undo the haConnected=true that caused AppShell to mount.
  const prevDemoRef = useRef(demo);
  useEffect(() => {
    const wasDemo = prevDemoRef.current;
    prevDemoRef.current = demo;

    if (demo) {
      useConnectionStore.setState({
        link: 'connected',
        serverStatus: 'online',
        haConnected: true,
        entities: DEMO_ENTITIES,
        areas: DEMO_AREAS,
        devices: DEMO_DEVICES,
        registry: DEMO_REGISTRY,
        favorites: DEMO_FAVORITES,
      });
    } else if (wasDemo) {
      // Transitioning from demo → real: atomically clear ALL demo state —
      // including link and serverStatus — before App.tsx's useEffect calls
      // connectToServer(). This prevents a window where the WebSocket connects
      // and delivers a status message while haConnected is still true from demo,
      // which would skip the loading screen and briefly render AppShell with
      // stale demo entities.
      useConnectionStore.setState({
        link: 'disconnected',
        serverStatus: null,
        haConnected: false,
        entities: {},
        areas: [],
        devices: [],
        registry: [],
        favorites: [],
      });
    }
  }, [demo]);

  const rooms = useMemo(
    () => buildRooms(entities, areas, devices, registry),
    [entities, areas, devices, registry],
  );

  // Slide direction is computed from the previous-vs-current page rank so
  // we keep the existing forward/backward animations exactly. The ref holds
  // the prior pathname's rank across renders.
  const prevRankRef = useRef(pageRank(location.pathname));
  const [navDir, setNavDir] = useState<'forward' | 'backward'>('forward');
  useEffect(() => {
    const next = pageRank(location.pathname);
    setNavDir(next >= prevRankRef.current ? 'forward' : 'backward');
    prevRankRef.current = next;
  }, [location.pathname]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeSheet = (): void => setSelectedId(null);
  const openEntity = (id: string): void => setSelectedId(id);

  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top whenever the route changes (matches old per-navigate scroll).
  useEffect(() => {
    if (mainRef.current && typeof mainRef.current.scrollTo === 'function') {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, [location.pathname]);

  // Expose <main>'s rendered width as a CSS var so .tab-header can bleed to its
  // edges even when content is centered in a narrower max-w column.
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = (): void => el.style.setProperty('--main-w', `${el.offsetWidth}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const enterClass = navDir === 'backward' ? 'section-enter-backward' : 'section-enter-forward';

  return (
    <div className="flex h-dvh [overflow:clip]">
      <Nav />
      <main ref={mainRef} className="flex-1 overflow-y-auto [overflow-x:clip] [scrollbar-gutter:stable] px-5 pb-24 md:px-8 md:pb-10">
        <div className="mx-auto max-w-[1100px]">
          <div key={location.pathname} className={enterClass}>
            <Routes>
              <Route path="/" element={<Navigate to={startupPath()} replace />} />
              <Route path="/home" element={<SummaryTab rooms={rooms} onSelect={openEntity} />} />
              <Route
                path="/favourites"
                element={
                  <QuickAccessTab
                    rooms={rooms}
                    onSelect={openEntity}
                    onSelectRoom={(areaId) => navigate(`/rooms/${areaId}`)}
                  />
                }
              />
              <Route
                path="/rooms"
                element={<RoomsOverview rooms={rooms} onOpen={(areaId) => navigate(`/rooms/${areaId}`)} />}
              />
              <Route
                path="/rooms/:areaId"
                element={<RoomRoute rooms={rooms} onSelect={openEntity} />}
              />
              <Route path="/map" element={<MapPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* Unknown routes drop the user on /home. */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </div>
      </main>
      <EntityDetailSheet entityId={selectedId} onClose={closeSheet} />
    </div>
  );
}
