import { type ReactElement, type ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  mdiArrowLeft, mdiCheckCircle, mdiAlertCircleOutline, mdiSync,
  mdiServerNetwork, mdiKeyVariant, mdiShieldAlertOutline,
} from '@mdi/js';
import { Icon } from '../ui/Icon.js';
import { SQUIRCLE } from '../ui/tokens.js';
import {
  getAdminSettings, saveAdminSettings, resetAdminSettings, testAdminConnection,
  type AdminSettings,
} from './adminApi.js';

const squircle = (radius: number): React.CSSProperties =>
  ({ borderRadius: `${radius}px`, cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties);

function Card({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section
      className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-[var(--blur-frost)]"
      style={squircle(18)}
    >
      <h2 className="m-0 mb-3 text-[13px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">{title}</h2>
      {children}
    </section>
  );
}

const inputClass =
  'w-full border border-[var(--color-border)] bg-black/10 px-3 py-2.5 text-[14.5px] font-medium ' +
  'text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] ' +
  'focus:border-white/40 focus:ring-2 focus:ring-white/20';

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }): ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

type Toast = { kind: 'success' | 'error' | 'info'; text: string } | null;

export function AdminPage(): ReactElement {
  const navigate = useNavigate();
  const onBack = (): void => { navigate('/settings'); };
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'testing' | 'resetting'>('idle');
  const [toast, setToast] = useState<Toast>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getAdminSettings();
      setSettings(s);
      setHaUrl(s.effective.url ?? '');
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!haUrl.trim()) {
      setToast({ kind: 'error', text: 'Home Assistant URL is required.' });
      return;
    }
    setBusy('saving');
    setToast(null);
    try {
      const payload: { haUrl: string; haToken?: string } = { haUrl: haUrl.trim() };
      if (haToken.trim() !== '') payload.haToken = haToken.trim();
      const s = await saveAdminSettings(payload);
      setSettings(s);
      setHaToken('');
      setToast({ kind: 'success', text: 'Saved. Reconnecting to Home Assistant…' });
      // Poll once after a short delay so the user sees the new haConnected state.
      setTimeout(() => { void refresh(); }, 1500);
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy('idle');
    }
  }

  async function onTest(): Promise<void> {
    if (!haUrl.trim() || !haToken.trim()) {
      setToast({ kind: 'error', text: 'Enter a URL and a fresh token to test.' });
      return;
    }
    setBusy('testing');
    setToast(null);
    try {
      const r = await testAdminConnection({ haUrl: haUrl.trim(), haToken: haToken.trim() });
      if (r.ok) {
        setToast({ kind: 'success', text: 'Test succeeded — connection works.' });
      } else {
        setToast({ kind: 'error', text: r.error ?? 'Test failed.' });
      }
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy('idle');
    }
  }

  async function onReset(): Promise<void> {
    if (!confirm('Clear stored URL and token and revert to environment defaults?')) return;
    setBusy('resetting');
    setToast(null);
    try {
      const s = await resetAdminSettings();
      setSettings(s);
      setHaUrl(s.effective.url ?? '');
      setHaToken('');
      setToast({ kind: 'info', text: 'Reverted to environment defaults. Reconnecting…' });
      setTimeout(() => { void refresh(); }, 1500);
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy('idle');
    }
  }

  const status = settings;

  return (
    <div>
      <div className="tab-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Settings"
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={squircle(12)}
          >
            <Icon path={mdiArrowLeft} size={18} />
          </button>
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Server administration</h1>
            <p className="m-0 mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
              Configure the Home Assistant connection used by every Aspect client.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        {/* Security warning */}
        <div
          className="flex items-start gap-3 border border-[#ffb86b]/30 bg-[#ffb86b]/10 p-3.5 text-[13px] text-[var(--color-text)]"
          style={squircle(14)}
        >
          <Icon path={mdiShieldAlertOutline} size={20} color="#ffb86b" />
          <span>
            <strong>No authentication.</strong> Anyone who can reach this server can change these
            settings. Restrict access at the network layer (Tailscale, reverse proxy, firewall).
          </span>
        </div>

        {/* Status */}
        <Card title="Status">
          {loading ? (
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Icon path={mdiSync} size={20} /> <span className="text-[14px]">Loading…</span>
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-2.5">
              <Icon path={mdiAlertCircleOutline} size={20} color="var(--color-danger)" />
              <span className="text-[14px]">Couldn't load settings: {loadError}</span>
            </div>
          ) : status ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <Icon
                  path={status.haConnected ? mdiCheckCircle : mdiAlertCircleOutline}
                  size={20}
                  color={status.haConnected ? '#5fd08a' : 'var(--color-danger)'}
                />
                <span className="text-[15px] font-semibold">
                  {status.haConnected ? 'Connected to Home Assistant' : 'Not connected'}
                </span>
              </div>
              {status.lastError && (
                <p className="m-0 text-[12.5px] text-[var(--color-danger)]">{status.lastError}</p>
              )}
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">
                Using {status.effective.source === 'db'
                  ? 'admin-saved values'
                  : status.effective.source === 'env'
                    ? 'environment defaults (HA_URL / HA_TOKEN)'
                    : 'no configuration yet'}
                .
              </p>
            </div>
          ) : null}
        </Card>

        {/* Form */}
        <form onSubmit={onSave}>
          <Card title="Home Assistant connection">
            <div className="flex flex-col gap-3">
              <Field
                label="URL"
                hint="Where this server reaches Home Assistant. Use the LAN address (e.g. http://homeassistant.local:8123)."
              >
                <div className="flex items-center gap-2">
                  <Icon path={mdiServerNetwork} size={18} color="var(--color-muted)" />
                  <input
                    type="url"
                    autoComplete="off"
                    placeholder="http://homeassistant.local:8123"
                    value={haUrl}
                    onChange={(e) => setHaUrl(e.target.value)}
                    className={inputClass}
                    style={squircle(12)}
                  />
                </div>
              </Field>

              <Field
                label="Long-lived access token"
                hint={
                  status?.effective.hasToken
                    ? 'A token is already stored. Leave blank to keep it; type a new one to replace.'
                    : 'Create one in Home Assistant: Profile → Security → Long-lived access tokens.'
                }
              >
                <div className="flex items-center gap-2">
                  <Icon path={mdiKeyVariant} size={18} color="var(--color-muted)" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={status?.effective.hasToken ? '•••••• (configured)' : 'Paste token'}
                    value={haToken}
                    onChange={(e) => setHaToken(e.target.value)}
                    className={inputClass}
                    style={squircle(12)}
                  />
                </div>
              </Field>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busy !== 'idle'}
                  className="flex items-center gap-1.5 bg-[var(--color-frost)] px-3.5 py-2 text-[13.5px] font-bold text-[var(--color-frost-text)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={squircle(13)}
                >
                  {busy === 'saving' ? 'Saving…' : 'Save & reconnect'}
                </button>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={busy !== 'idle'}
                  className="flex items-center gap-1.5 border border-[var(--color-border)] px-3.5 py-2 text-[13.5px] font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={squircle(13)}
                >
                  {busy === 'testing' ? 'Testing…' : 'Test'}
                </button>
                {(status?.envHasUrl || status?.envHasToken) && status?.effective.source === 'db' && (
                  <button
                    type="button"
                    onClick={onReset}
                    disabled={busy !== 'idle'}
                    className="ml-auto flex items-center gap-1.5 border border-[var(--color-danger)]/40 px-3.5 py-2 text-[13.5px] font-bold text-[var(--color-danger)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    style={squircle(13)}
                  >
                    {busy === 'resetting' ? 'Resetting…' : 'Revert to env defaults'}
                  </button>
                )}
              </div>

              {toast && (
                <div
                  role="status"
                  className={[
                    'mt-1 px-3 py-2 text-[13px] font-semibold',
                    toast.kind === 'success' && 'bg-[#5fd08a]/15 text-[#5fd08a]',
                    toast.kind === 'error' && 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
                    toast.kind === 'info' && 'bg-white/10 text-[var(--color-text)]',
                  ].filter(Boolean).join(' ')}
                  style={squircle(12)}
                >
                  {toast.text}
                </div>
              )}
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
