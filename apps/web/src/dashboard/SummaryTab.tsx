import { useMemo, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  mdiThermostat, mdiShieldCheckOutline, mdiPlayCircleOutline, mdiAccount,
  mdiAlertCircleOutline, mdiWeatherPartlyCloudy, mdiBellOutline, mdiBell, mdiPower,
  mdiLightbulbOutline,
} from '@mdi/js';
import { useConnectionStore } from '../store/connectionStore.js';
import { buildSummary } from './summary.js';
import { hasCategory, type FilterKind } from './filterView.js';
import { FilterPanel } from './FilterPanel.js';
import type { Room } from './rooms.js';
import { Icon } from '../ui/Icon.js';
import { StatusPill } from '../ui/StatusPill.js';
import { Tile } from '../ui/Tile.js';
import { iconFor, tintFor } from '../domain/icons.js';
import { formatState, isActive, friendlyName, domainOf } from '../domain/entities.js';
import { callService } from '../server-client/commands.js';
import { SQUIRCLE } from '../ui/tokens.js';

const ALERT_ICON = {
  open: mdiAlertCircleOutline, unlocked: mdiShieldCheckOutline,
  safety: mdiAlertCircleOutline, battery: mdiAlertCircleOutline,
} as const;

const chipClass = 'flex items-center gap-1.5 rounded-[13px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-muted)] backdrop-blur-[var(--blur-frost)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

// 'up' = opening filter (both views pull up); 'down' = closing filter (both views push down).
const filterTransition = {
  enter: (dir: 'up' | 'down') => ({ opacity: 0, y: dir === 'up' ? 12 : -12 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:   (dir: 'up' | 'down') => ({ opacity: 0, y: dir === 'up' ? -12 : 12, transition: { duration: 0.16, ease: 'easeIn' } }),
};

export function SummaryTab({
  rooms,
  onSelect,
}: {
  rooms: Room[];
  onSelect: (entityId: string) => void;
}): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const registry = useConnectionStore((s) => s.registry);
  const devices = useConnectionStore((s) => s.devices);
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const s = useMemo(() => buildSummary(entities, registry, devices), [entities, registry, devices]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKind | null>(null);
  const [filterDir, setFilterDir] = useState<'up' | 'down'>('up');

  const toggleFilter = (kind: FilterKind): void => {
    setFilterDir(activeFilter === kind ? 'down' : 'up');
    setActiveFilter((f) => (f === kind ? null : kind));
  };

  function handleAlertClick(entityId: string): void {
    setShowAlerts(false);
    onSelect(entityId);
  }

  const anyLightsOn = s.lightsOn.length > 0;
  const allLights = Object.values(entities).filter((e) => domainOf(e.entityId) === 'light');

  function toggleLights(): void {
    if (anyLightsOn) {
      for (const id of s.lightsOn) {
        optimistic(id, { state: 'off' });
        callService('light', 'turn_off', id);
      }
    } else {
      for (const e of allLights) {
        optimistic(e.entityId, { state: 'on' });
        callService('light', 'turn_on', e.entityId);
      }
    }
  }

  // Category presence — determines which pills to show.
  const hasLights = useMemo(() => hasCategory(rooms, 'lights'), [rooms]);
  const hasClimate = useMemo(() => hasCategory(rooms, 'climate'), [rooms]);
  const hasSecurity = useMemo(() => hasCategory(rooms, 'security'), [rooms]);
  const hasPlaying = useMemo(() => hasCategory(rooms, 'playing'), [rooms]);
  const hasPills = hasLights || hasClimate || hasSecurity || hasPlaying;

  // Pill summary values.
  const lightValue = s.lightsOn.length > 0 ? `${s.lightsOn.length} on` : 'All off';
  const climateValue = s.climate?.range ?? (s.climate ? `${s.climate.count} thermostats` : 'Shading');
  const securityValue = s.security
    ? (s.security.openings > 0
      ? `${s.security.openings} open`
      : s.security.unlocked > 0
        ? `${s.security.unlocked} unlocked`
        : 'All secure')
    : 'All secure';
  const playingValue = s.playing > 0 ? `${s.playing} playing` : 'Idle';

  const subtitle: string[] = [];
  if (s.deviceCount > 0) subtitle.push(`${s.deviceCount} ${s.deviceCount === 1 ? 'device' : 'devices'}`);
  if (s.lightsOn.length > 0) subtitle.push(`${s.lightsOn.length} ${s.lightsOn.length === 1 ? 'light' : 'lights'} on`);
  if (s.unavailableCount > 0) subtitle.push(`${s.unavailableCount} not responding`);

  return (
    <div className="grid gap-6">
      {/* Sticky header + filter pills */}
      <div className="tab-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Home</h1>
            {subtitle.length > 0 && (
              <p className="m-0 mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
                {subtitle.join(' · ')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-2 pt-1">
          {s.alerts.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAlerts((v) => !v)}
                className={chipClass}
                style={{ cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties}
              >
                <span className="relative">
                  <Icon path={showAlerts ? mdiBell : mdiBellOutline} size={16} color={showAlerts ? '#ffd27d' : undefined} />
                  <span className="absolute -right-1.5 -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#ff8a8a] px-0.5 text-[9px] font-bold leading-none text-white">
                    {s.alerts.length}
                  </span>
                </span>
                Alerts
              </button>
              {showAlerts && (
                <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)} />
              )}
              <AnimatePresence>
                {showAlerts && (
                  <motion.div
                    key="alert-panel"
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[272px] overflow-hidden rounded-[18px] border border-[#5a2e2e] bg-[rgba(22,14,14,0.96)] shadow-2xl backdrop-blur-[24px]"
                    style={{ cornerShape: 'superellipse(4)' } as React.CSSProperties}
                  >
                    <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.6px] text-[#ff8a8a]/70">
                      Needs attention
                    </p>
                    <div className="pb-1.5">
                      {s.alerts.map((a) => (
                        <button
                          key={a.entityId}
                          type="button"
                          onClick={() => handleAlertClick(a.entityId)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 focus:outline-none"
                        >
                          <Icon path={ALERT_ICON[a.kind]} size={18} color="#ff8a8a" />
                          <span className="flex-1 text-[13px] font-semibold text-white">{a.name}</span>
                          <span className="text-[12px] text-[#ff9a9a]">{a.detail}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <button
            type="button"
            onClick={toggleLights}
            className={chipClass}
            style={{ cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties}
          >
            <Icon path={mdiPower} size={16} />
            {anyLightsOn ? 'Turn off' : 'Turn on'}
          </button>
          </div>
        </div>

        {/* Filter pills — always shown when the home has entities in any category */}
        {hasPills && (
          <div className="-mx-5 mt-3 flex gap-[9px] overflow-x-auto px-5 pb-1">
            {hasLights && (
              <StatusPill
                path={mdiLightbulbOutline}
                label="Lights"
                value={lightValue}
                active={activeFilter === 'lights'}
                onClick={() => toggleFilter('lights')}
              />
            )}
            {hasClimate && (
              <StatusPill
                path={mdiThermostat}
                label="Climate"
                value={climateValue}
                active={activeFilter === 'climate'}
                onClick={() => toggleFilter('climate')}
              />
            )}
            {hasSecurity && (
              <StatusPill
                path={mdiShieldCheckOutline}
                label="Security"
                value={securityValue}
                active={activeFilter === 'security'}
                onClick={() => toggleFilter('security')}
              />
            )}
            {hasPlaying && (
              <StatusPill
                path={mdiPlayCircleOutline}
                label="Playing"
                value={playingValue}
                active={activeFilter === 'playing'}
                onClick={() => toggleFilter('playing')}
              />
            )}
          </div>
        )}
      </div>

      {/* Animated zone — filter panel XOR home summary; initial=false so CSS section-enter handles first load */}
      <AnimatePresence mode="wait" initial={false} custom={filterDir}>
        {activeFilter ? (
          <motion.div
            key={activeFilter}
            custom={filterDir}
            variants={filterTransition}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <FilterPanel kind={activeFilter} rooms={rooms} onSelect={onSelect} />
          </motion.div>
        ) : (s.people.length > 0 || !!s.weather || s.thermostats.length > 0) ? (
          <motion.div
            key="home"
            custom={filterDir}
            variants={filterTransition}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid gap-6"
          >
            {s.people.length > 0 && (
              <section className="grid gap-2.5">
                <h2 className="m-0 text-[15px] font-bold text-[var(--color-muted)]">Who&apos;s home</h2>
                <div className="flex flex-wrap gap-2.5">
                  {s.people.map((p) => (
                    <div key={p.entityId} className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[rgba(36,40,50,0.5)] px-3 py-2 backdrop-blur-[18px]">
                      {p.picture
                        ? <img src={p.picture} alt="" className="h-6 w-6 rounded-full object-cover" />
                        : <Icon path={mdiAccount} size={18} color={p.home ? '#8ee6b0' : 'var(--color-muted)'} />}
                      <span className="text-[13px] font-semibold">{p.name}</span>
                      <span className="text-[12px] text-[var(--color-muted)]">{p.home ? 'Home' : 'Away'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(s.weather || s.thermostats.length > 0) && (
              <section className="grid gap-2.5">
                <h2 className="m-0 text-[15px] font-bold text-[var(--color-muted)]">Climate</h2>
                <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                  {s.weather && (
                    <div className="flex min-h-[120px] flex-col rounded-[20px] border border-white/10 bg-[rgba(36,40,50,0.5)] p-4 backdrop-blur-[22px] backdrop-saturate-[1.3]"
                      style={{ cornerShape: 'superellipse(4)' } as React.CSSProperties}>
                      <Icon path={mdiWeatherPartlyCloudy} size={26} color="#86c2ff" />
                      <span className="mt-auto text-[14px] font-bold capitalize">{s.weather.state.replace(/_/g, ' ')}</span>
                      {s.weather.temp && <span className="text-[12px] text-[var(--color-muted)]">{s.weather.temp}</span>}
                    </div>
                  )}
                  {s.thermostats.map((id) => {
                    const entity = entities[id];
                    if (!entity) return null;
                    return (
                      <Tile key={id} path={iconFor(entity)} tint={tintFor('climate')} name={friendlyName(entity, null)}
                        state={formatState(entity)} active={isActive(entity)} wide onPress={() => onSelect(id)} />
                    );
                  })}
                </div>
              </section>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
