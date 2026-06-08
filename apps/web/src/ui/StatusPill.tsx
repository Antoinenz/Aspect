import type { ReactElement } from 'react';
import { Icon } from './Icon.js';
import { SQUIRCLE } from './tokens.js';

export function StatusPill({
  path, label, value, active = false, onClick,
}: {
  path: string;
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}): ReactElement {
  const sq = { borderRadius: '18px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties;
  return (
    <button
      type="button"
      onClick={onClick}
      style={sq}
      className={[
        'flex flex-none items-center gap-2.5 px-[15px] py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-colors duration-150',
        active
          ? 'border border-white/30 bg-white/[0.18] backdrop-blur-[18px] backdrop-saturate-[1.3]'
          : 'border border-white/10 bg-[rgba(40,44,54,0.5)] backdrop-blur-[18px] backdrop-saturate-[1.3]',
      ].join(' ')}
    >
      <Icon path={path} size={18} color={active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'} />
      <span>
        <b className="block text-[13px] font-bold">{label}</b>
        <span className="block text-[11px] text-[var(--color-muted)]">{value}</span>
      </span>
    </button>
  );
}
