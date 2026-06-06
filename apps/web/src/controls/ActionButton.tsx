import type { ReactElement, ReactNode } from 'react';

export function ActionButton({
  onClick,
  active = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        cursor: 'pointer',
        padding: '10px 16px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        font: 'inherit',
        background: active ? 'var(--active-icon)' : 'var(--surface)',
        color: active ? '#1a1205' : 'var(--text)',
        border: `1px solid ${active ? 'var(--active-border)' : 'var(--border)'}`,
      }}
    >
      {children}
    </button>
  );
}
