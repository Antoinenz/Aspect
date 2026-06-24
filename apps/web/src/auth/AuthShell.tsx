import { type ReactElement, type ReactNode } from 'react';
import { SQUIRCLE } from '../ui/tokens.js';

const squircle = (radius: number): React.CSSProperties =>
  ({ borderRadius: `${radius}px`, cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties);

/**
 * Centered card layout shared by /login and /signup. Mirrors the rest of
 * the app's frosted-tile aesthetic so the auth screens feel like part of
 * Aspect, not a bolted-on form.
 */
export function AuthShell({
  title, subtitle, children, footer,
}: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}): ReactElement {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-5 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(90,110,255,0.10) 0%, var(--color-bg, #0e0f13) 60%)' }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10" />
          <b className="text-[22px] font-extrabold tracking-[-0.4px]">Aspect</b>
        </div>
        <section
          className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 backdrop-blur-[var(--blur-frost)]"
          style={squircle(20)}
        >
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.4px]">{title}</h1>
          {subtitle && (
            <p className="m-0 mt-1 text-[13.5px] text-[var(--color-muted)]">{subtitle}</p>
          )}
          <div className="mt-5 flex flex-col gap-3.5">
            {children}
          </div>
        </section>
        {footer && <div className="mt-4 text-center">{footer}</div>}
      </div>
    </div>
  );
}

export const authInputClass =
  'w-full border border-[var(--color-border)] bg-black/10 px-3 py-2.5 text-[14.5px] font-medium ' +
  'text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] ' +
  'focus:border-white/40 focus:ring-2 focus:ring-white/20';

export const authButtonClass =
  'flex w-full items-center justify-center gap-1.5 bg-[var(--color-frost)] px-3.5 py-2.5 ' +
  'text-[14px] font-bold text-[var(--color-frost-text)] disabled:opacity-50 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export function authSquircle(radius: number): React.CSSProperties {
  return squircle(radius);
}
