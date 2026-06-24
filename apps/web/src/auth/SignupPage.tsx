import { type ReactElement, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell, authButtonClass, authInputClass, authSquircle } from './AuthShell.js';
import { signup } from './authApi.js';
import { useAuthStore } from './authStore.js';

export function SignupPage(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') ?? undefined;

  const setStatus = useAuthStore((s) => s.setStatus);
  const setHasUsers = useAuthStore((s) => s.setHasUsers);
  const hasUsers = useAuthStore((s) => s.hasUsers);
  const isFirstAdmin = !hasUsers && !inviteToken;

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await signup({
        username: username.trim(),
        password,
        displayName: displayName.trim() || username.trim(),
        ...(inviteToken ? { inviteToken } : {}),
      });
      setStatus('authenticated', user);
      setHasUsers(true);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  let subtitle = 'Create your account.';
  if (isFirstAdmin) {
    subtitle = "You'll be the first user, so this account becomes admin.";
  } else if (inviteToken) {
    subtitle = "You've been invited to join this home.";
  }

  return (
    <AuthShell
      title={isFirstAdmin ? 'Set up Aspect' : 'Join the home'}
      subtitle={subtitle}
      footer={
        hasUsers ? (
          <span className="text-[13px] text-[var(--color-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--color-text)] hover:underline">
              Sign in
            </Link>
          </span>
        ) : null
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">Display name</span>
          <input
            type="text"
            autoComplete="name"
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={authInputClass}
            style={authSquircle(12)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">Username</span>
          <input
            type="text"
            autoComplete="username"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authSquircle(12)}
            required
            minLength={8}
          />
          <span className="text-[12px] text-[var(--color-muted)]">8 characters minimum.</span>
        </label>

        {inviteToken && (
          <div
            className="bg-[var(--color-frost)]/30 px-3 py-2 text-[12.5px] text-[var(--color-text)]"
            style={authSquircle(12)}
          >
            Joining with invitation token <code className="font-mono text-[12px]">{inviteToken.slice(0, 6)}…</code>
          </div>
        )}

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
          {busy ? 'Creating account…' : isFirstAdmin ? 'Create admin account' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
