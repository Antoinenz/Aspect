import { type ReactElement, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthShell, authButtonClass, authInputClass, authSquircle } from './AuthShell.js';
import { login } from './authApi.js';
import { useAuthStore } from './authStore.js';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const setStatus = useAuthStore((s) => s.setStatus);
  const hasUsers = useAuthStore((s) => s.hasUsers);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await login({ username: username.trim(), password });
      setStatus('authenticated', user);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/home';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your home."
      footer={
        !hasUsers ? (
          <span className="text-[13px] text-[var(--color-muted)]">
            No accounts yet?{' '}
            <Link to="/signup" className="font-semibold text-[var(--color-text)] hover:underline">
              Set up the first admin
            </Link>
          </span>
        ) : null
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={authInputClass}
            style={authSquircle(12)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authSquircle(12)}
            required
          />
        </label>

        {error && (
          <div
            role="alert"
            className="bg-[var(--color-danger)]/15 px-3 py-2 text-[13px] font-semibold text-[var(--color-danger)]"
            style={authSquircle(12)}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className={authButtonClass} style={authSquircle(13)}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
