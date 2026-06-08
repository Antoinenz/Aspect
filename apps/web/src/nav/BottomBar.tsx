import type { ReactElement } from 'react';
import { Icon } from '../ui/Icon.js';
import { ALL_DESTINATIONS, type Section } from './navItems.js';

export function BottomBar({ section, onNavigate }: { section: Section; onNavigate: (s: Section) => void }): ReactElement {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/10 bg-[rgba(18,20,26,0.8)] backdrop-blur-[22px] backdrop-saturate-[1.3] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ALL_DESTINATIONS.map((item) => {
        const active = section === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold focus:outline-none ${active ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}
          >
            <Icon path={item.icon} size={22} color={active ? '#f4f5f7' : 'var(--color-muted)'} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
