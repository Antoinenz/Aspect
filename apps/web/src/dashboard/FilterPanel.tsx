import { type ReactElement, useMemo } from 'react';
import { motion } from 'motion/react';
import { mdiPower, mdiLock, mdiPause, mdiArrowUp, mdiArrowDown } from '@mdi/js';
import { Tile } from '../ui/Tile.js';
import { Icon } from '../ui/Icon.js';
import { formatState, isActive } from '../domain/entities.js';
import { iconFor, tintFor } from '../domain/icons.js';
import { tileAction } from '../domain/tileAction.js';
import { callService } from '../server-client/commands.js';
import { useConnectionStore } from '../store/connectionStore.js';
import { filterRooms, type FilterKind } from './filterView.js';
import type { Room, RoomEntity } from './rooms.js';
import { SQUIRCLE } from '../ui/tokens.js';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

function buildQuickActions(
  kind: FilterKind,
  allEntities: RoomEntity[],
  optimistic: (id: string, patch: { state?: string }) => void,
): QuickAction[] {
  const actions: QuickAction[] = [];

  if (kind === 'lights') {
    const controllable = allEntities.filter((re) => re.entity.state !== 'unavailable');
    const anyOff = controllable.some((re) => !isActive(re.entity));
    const anyOn = controllable.some((re) => isActive(re.entity));
    if (anyOff) actions.push({
      id: 'all_on', label: 'All on', icon: mdiPower,
      onClick: () => {
        for (const re of controllable) {
          optimistic(re.entity.entityId, { state: 'on' });
          callService(re.domain, 'turn_on', re.entity.entityId);
        }
      },
    });
    if (anyOn) actions.push({
      id: 'all_off', label: 'All off', icon: mdiPower,
      onClick: () => {
        for (const re of controllable) {
          optimistic(re.entity.entityId, { state: 'off' });
          callService(re.domain, 'turn_off', re.entity.entityId);
        }
      },
    });
  }

  if (kind === 'climate') {
    const covers = allEntities.filter((re) => re.domain === 'cover' && re.entity.state !== 'unavailable');
    if (covers.length > 0) {
      const anyClosed = covers.some((re) => re.entity.state !== 'open');
      const anyOpen = covers.some((re) => re.entity.state === 'open');
      if (anyClosed) actions.push({
        id: 'open_all', label: 'Open all', icon: mdiArrowUp,
        onClick: () => {
          for (const re of covers) {
            optimistic(re.entity.entityId, { state: 'open' });
            callService('cover', 'open_cover', re.entity.entityId);
          }
        },
      });
      if (anyOpen) actions.push({
        id: 'close_all', label: 'Close all', icon: mdiArrowDown,
        onClick: () => {
          for (const re of covers) {
            optimistic(re.entity.entityId, { state: 'closed' });
            callService('cover', 'close_cover', re.entity.entityId);
          }
        },
      });
    }
  }

  if (kind === 'security') {
    const locks = allEntities.filter((re) => re.domain === 'lock' && re.entity.state === 'unlocked');
    if (locks.length > 0) actions.push({
      id: 'lock_all', label: 'Lock all', icon: mdiLock,
      onClick: () => {
        for (const re of locks) {
          optimistic(re.entity.entityId, { state: 'locked' });
          callService('lock', 'lock', re.entity.entityId);
        }
      },
    });
    const openCovers = allEntities.filter((re) => re.domain === 'cover' && re.entity.state === 'open');
    if (openCovers.length > 0) actions.push({
      id: 'close_covers', label: 'Close all', icon: mdiArrowDown,
      onClick: () => {
        for (const re of openCovers) {
          optimistic(re.entity.entityId, { state: 'closed' });
          callService('cover', 'close_cover', re.entity.entityId);
        }
      },
    });
  }

  if (kind === 'playing') {
    const playing = allEntities.filter((re) => re.entity.state === 'playing');
    if (playing.length > 0) actions.push({
      id: 'pause_all', label: 'Pause all', icon: mdiPause,
      onClick: () => {
        for (const re of playing) callService('media_player', 'media_pause', re.entity.entityId);
      },
    });
  }

  return actions;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};

export function FilterPanel({
  kind,
  rooms,
  onSelect,
}: {
  kind: FilterKind;
  rooms: Room[];
  onSelect: (entityId: string) => void;
}): ReactElement {
  const optimistic = useConnectionStore((s) => s.applyOptimistic);
  const filteredRooms = useMemo(() => filterRooms(rooms, kind), [rooms, kind]);
  const allEntities = useMemo(() => filteredRooms.flatMap((r) => r.entities), [filteredRooms]);
  const quickActions = useMemo(
    () => buildQuickActions(kind, allEntities, optimistic),
    [kind, allEntities, optimistic],
  );

  const chipSq = { borderRadius: '13px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="show">
      {/* Quick actions */}
      {quickActions.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {quickActions.map((qa) => (
            <motion.button
              key={qa.id}
              type="button"
              onClick={qa.onClick}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex items-center gap-2 border border-white/15 bg-white/[0.07] px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.13] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={chipSq}
            >
              <Icon path={qa.icon} size={15} color="rgba(255,255,255,0.75)" />
              {qa.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Entities grouped by room */}
      {filteredRooms.length === 0 ? (
        <motion.p variants={itemVariants} className="m-0 text-[14px] text-[var(--color-muted)]">
          No devices in this category.
        </motion.p>
      ) : (
        filteredRooms.map(({ areaId, name, entities }) => (
          <motion.section key={areaId} variants={itemVariants}>
            <h2 className="m-0 mb-3 text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">
              {name}
            </h2>
            <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {entities.map((re) => (
                <Tile
                  key={re.entity.entityId}
                  path={iconFor(re.entity)}
                  tint={tintFor(re.entity)}
                  name={re.name}
                  state={formatState(re.entity)}
                  active={isActive(re.entity)}
                  wide={re.wide}
                  battery={re.battery}
                  onAction={tileAction(re.entity, optimistic)}
                  onPress={() => onSelect(re.entity.entityId)}
                />
              ))}
            </div>
          </motion.section>
        ))
      )}
    </motion.div>
  );
}
