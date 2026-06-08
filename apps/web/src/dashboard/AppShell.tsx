import { useMemo, useState, useCallback, useRef, useEffect, type ReactElement } from 'react';
import { useConnectionStore } from '../store/connectionStore.js';
import { useDemoStore } from '../demo/demoStore.js';
import { DEMO_ENTITIES, DEMO_AREAS, DEMO_DEVICES, DEMO_REGISTRY, DEMO_FAVORITES } from '../demo/demoData.js';
import { Nav } from '../nav/Nav.js';
import type { Section } from '../nav/navItems.js';
import { ALL_DESTINATIONS } from '../nav/navItems.js';
import { buildRooms } from './rooms.js';
import { SummaryTab } from './SummaryTab.js';
import { QuickAccessTab } from './QuickAccessTab.js';
import { RoomsOverview } from './RoomsGrid.js';
import { RoomView } from './RoomView.js';
import { EntityDetailSheet } from './EntityDetailSheet.js';
import { SettingsPage } from '../settings/SettingsPage.js';
import { MapPage } from '../map/MapPage.js';

type NavDir = 'forward' | 'backward';

function dirBetween(from: Section, to: Section): NavDir {
  const fi = ALL_DESTINATIONS.findIndex((d) => d.id === from);
  const ti = ALL_DESTINATIONS.findIndex((d) => d.id === to);
  return ti >= fi ? 'forward' : 'backward';
}

export function AppShell(): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const areas = useConnectionStore((s) => s.areas);
  const devices = useConnectionStore((s) => s.devices);
  const registry = useConnectionStore((s) => s.registry);
  const demo = useDemoStore((s) => s.demo);

  useEffect(() => {
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
    } else {
      // Clear demo data; App.tsx reconnects the socket which will repopulate.
      // serverStatus must be reset too so haOffline check in App.tsx works correctly.
      useConnectionStore.setState({
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

  const rooms = useMemo(() => buildRooms(entities, areas, devices, registry), [entities, areas, devices, registry]);

  const [section, setSection] = useState<Section>(() => {
    const saved = localStorage.getItem('aspect-startup-section') as Section | null;
    const valid: Section[] = ['home', 'rooms', 'favorites', 'map', 'settings'];
    return saved && valid.includes(saved) ? saved : 'home';
  });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navDir, setNavDir] = useState<NavDir>('forward');
  const mainRef = useRef<HTMLElement>(null);

  // Ref so navigate callback always reads the latest section without being recreated.
  const sectionRef = useRef(section);
  sectionRef.current = section;

  const navigate = useCallback((s: Section) => {
    setNavDir(dirBetween(sectionRef.current, s));
    setSection(s);
    setRoomId(null);
    if (mainRef.current && typeof mainRef.current.scrollTo === 'function') {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, []);

  const closeSheet = useCallback(() => setSelectedId(null), []);
  const openEntity = useCallback((id: string) => setSelectedId(id), []);

  const openRoom = useCallback((areaId: string) => {
    setNavDir('forward');
    setRoomId(areaId);
  }, []);

  const closeRoom = useCallback(() => {
    setNavDir('backward');
    setRoomId(null);
  }, []);

  const activeRoom = rooms.find((r) => r.areaId === roomId) ?? null;

  const enterClass = navDir === 'backward' ? 'section-enter-backward' : 'section-enter-forward';

  return (
    <div className="flex h-dvh overflow-hidden">
      <Nav section={section} onNavigate={navigate} />
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] px-5 pb-24 pt-[calc(24px+env(safe-area-inset-top))] md:px-8 md:pb-10">
        <div className="mx-auto max-w-[1100px]">
          <div key={section + (roomId ?? '')} className={enterClass}>
            {section === 'home' && <SummaryTab rooms={rooms} onSelect={openEntity} />}
            {section === 'favorites' && (
              <QuickAccessTab
                rooms={rooms}
                onSelect={openEntity}
                onSelectRoom={(areaId) => {
                  setNavDir(dirBetween(sectionRef.current, 'rooms'));
                  setSection('rooms');
                  setRoomId(areaId);
                }}
              />
            )}
            {section === 'rooms' && (
              activeRoom
                ? <RoomView room={activeRoom} onBack={closeRoom} onSelect={(re) => openEntity(re.entity.entityId)} />
                : <RoomsOverview rooms={rooms} onOpen={openRoom} />
            )}
            {section === 'map' && <MapPage />}
            {section === 'settings' && <SettingsPage />}
          </div>
        </div>
      </main>
      <EntityDetailSheet entityId={selectedId} onClose={closeSheet} />
    </div>
  );
}
