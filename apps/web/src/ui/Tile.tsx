import { motion } from 'motion/react';
import type { ReactElement } from 'react';
import { Icon } from './Icon.js';
import { SQUIRCLE } from './tokens.js';

export interface TileProps {
  path: string;
  tint?: string | null;
  name: string;
  state: string;
  active: boolean;
  wide?: boolean;
  battery?: number | null;
  onPress: () => void;
}

export function Tile({
  path, tint, name, state, active, wide = false, battery = null, onPress,
}: TileProps): ReactElement {
  const sq = { borderRadius: '24px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  const chipSq = { borderRadius: '13px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  const low = battery !== null && battery <= 15;
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        'relative flex min-h-[120px] flex-col p-4 text-left font-[inherit] cursor-pointer',
        'border backdrop-blur-[22px]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        wide ? 'col-span-2' : '',
        active
          ? 'bg-[#f6f7f9]/95 border-white/50 text-[#15161a]'
          : 'bg-[rgba(36,40,50,0.5)] border-white/10 text-[var(--color-text)] backdrop-saturate-[1.3]',
      ].join(' ')}
      style={sq}
    >
      {battery !== null && (
        <span className={`absolute right-3.5 top-3.5 text-[11px] font-semibold ${low ? 'text-[#ff8a8a]' : active ? 'text-[#7c8090]' : 'text-[rgba(235,238,245,0.55)]'}`}>
          {battery}%
        </span>
      )}
      <span
        className="flex h-[42px] w-[42px] items-center justify-center"
        style={{ ...chipSq, background: active ? '#191c24' : 'rgba(255,255,255,0.10)' }}
      >
        <Icon path={path} size={22} color={active ? '#fff' : (tint ?? '#dfe3ea')} />
      </span>
      <span className={`mt-auto text-[14px] font-bold tracking-[-0.2px] ${active ? 'text-[#15161a]' : ''}`}>{name}</span>
      <span className={`mt-0.5 text-[12px] font-medium ${active ? 'text-[#565a66]' : 'text-[var(--color-muted)]'}`}>{state}</span>
    </motion.button>
  );
}
