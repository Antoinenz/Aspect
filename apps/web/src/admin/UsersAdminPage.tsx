import { type ReactElement, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  mdiArrowLeft, mdiAccountMultiple, mdiAccountPlus, mdiContentCopy,
  mdiQrcode, mdiDelete, mdiShieldAccount, mdiAccount, mdiCheck,
} from '@mdi/js';
import { Icon } from '../ui/Icon.js';
import { SQUIRCLE } from '../ui/tokens.js';
import { useAuthStore } from '../auth/authStore.js';
import type { AuthUser, Invite, Role } from '../auth/types.js';
import {
  listUsers, patchUserRole, deleteUser,
  listInvites, createInvite, deleteInvite,
} from '../auth/authApi.js';

const squircle = (radius: number): React.CSSProperties =>
  ({ borderRadius: `${radius}px`, cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties);

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }): ReactElement {
  return (
    <section
      className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-[var(--blur-frost)]"
      style={squircle(18)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.6px] text-[var(--color-muted)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function inviteUrl(token: string): string {
  return `${window.location.origin}/signup?invite=${encodeURIComponent(token)}`;
}

function UsersList({
  users, meId, onDelete, onRoleChange,
}: {
  users: AuthUser[]; meId: string;
  onDelete: (id: string) => void;
  onRoleChange: (id: string, role: Role) => void;
}): ReactElement {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {users.map((u) => {
        const isSelf = u.id === meId;
        return (
          <li
            key={u.id}
            className="flex items-center gap-3 border border-[var(--color-border)] px-3 py-2.5"
            style={squircle(13)}
          >
            <Icon
              path={u.role === 'admin' ? mdiShieldAccount : mdiAccount}
              size={20}
              color={u.role === 'admin' ? '#ffd27d' : 'var(--color-muted)'}
            />
            <div className="flex flex-col">
              <span className="text-[14.5px] font-semibold">{u.displayName} {isSelf && <span className="text-[12px] font-normal text-[var(--color-muted)]">(you)</span>}</span>
              <span className="text-[12px] text-[var(--color-muted)]">@{u.username} · {u.role}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <select
                value={u.role}
                onChange={(e) => onRoleChange(u.id, e.target.value as Role)}
                disabled={isSelf}
                className="border border-[var(--color-border)] bg-black/10 px-2 py-1 text-[12.5px] font-semibold disabled:opacity-50"
                style={squircle(10)}
                aria-label={`Role for ${u.username}`}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => onDelete(u.id)}
                disabled={isSelf}
                aria-label={`Delete ${u.username}`}
                className="flex h-8 w-8 items-center justify-center border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-30"
                style={squircle(10)}
              >
                <Icon path={mdiDelete} size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function InviteRow({ invite, onDelete, onShare }: {
  invite: Invite; onDelete: (token: string) => void; onShare: (invite: Invite) => void;
}): ReactElement {
  const used = invite.usedAt !== null;
  const expired = !used && new Date(invite.expiresAt).getTime() < Date.now();
  let label = `${invite.role}`;
  if (used) label += ' · used';
  else if (expired) label += ' · expired';
  else label += ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`;
  return (
    <li
      className="flex items-center gap-3 border border-[var(--color-border)] px-3 py-2.5"
      style={squircle(13)}
    >
      <Icon path={mdiAccountPlus} size={20} color="var(--color-muted)" />
      <div className="flex flex-col">
        <code className="font-mono text-[13px]">{invite.token.slice(0, 10)}…</code>
        <span className="text-[12px] text-[var(--color-muted)]">{label}</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {!used && !expired && (
          <button
            type="button"
            onClick={() => onShare(invite)}
            className="flex items-center gap-1.5 border border-[var(--color-border)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
            style={squircle(10)}
          >
            <Icon path={mdiQrcode} size={14} />
            Share
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(invite.token)}
          aria-label={`Delete invite ${invite.token.slice(0, 6)}`}
          className="flex h-8 w-8 items-center justify-center border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          style={squircle(10)}
        >
          <Icon path={mdiDelete} size={16} />
        </button>
      </div>
    </li>
  );
}

export function UsersAdminPage(): ReactElement {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<Role>('member');
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<{ invite: Invite; qr: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [u, i] = await Promise.all([listUsers(), listInvites()]);
      setUsers(u.users);
      setInvites(i.invites);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function onCreateInvite(): Promise<void> {
    try {
      const { invite } = await createInvite(creating);
      const qr = await QRCode.toDataURL(inviteUrl(invite.token), { width: 280, margin: 1 });
      setSharing({ invite, qr });
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onShareInvite(invite: Invite): Promise<void> {
    const qr = await QRCode.toDataURL(inviteUrl(invite.token), { width: 280, margin: 1 });
    setSharing({ invite, qr });
    setCopied(false);
  }

  async function onCopy(): Promise<void> {
    if (!sharing) return;
    await navigator.clipboard.writeText(inviteUrl(sharing.invite.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onDeleteUser(id: string): Promise<void> {
    if (!confirm('Delete this user? Their sessions will be revoked.')) return;
    try {
      await deleteUser(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onChangeRole(id: string, role: Role): Promise<void> {
    try {
      await patchUserRole(id, role);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onDeleteInvite(token: string): Promise<void> {
    try {
      await deleteInvite(token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="tab-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label="Back to admin"
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={squircle(12)}
          >
            <Icon path={mdiArrowLeft} size={18} />
          </button>
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Users & invites</h1>
            <p className="m-0 mt-0.5 text-[12.5px] font-medium text-[var(--color-muted)]">
              Invite family members and manage who can do what.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        {error && (
          <div
            role="alert"
            className="bg-[var(--color-danger)]/15 px-3 py-2 text-[13px] font-semibold text-[var(--color-danger)]"
            style={squircle(12)}
          >
            {error}
          </div>
        )}

        <Card
          title="Members"
          action={
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-muted)]">
              <Icon path={mdiAccountMultiple} size={16} />
              {users.length}
            </span>
          }
        >
          {loading ? (
            <p className="m-0 text-[13px] text-[var(--color-muted)]">Loading…</p>
          ) : (
            <UsersList users={users} meId={me?.id ?? ''} onDelete={onDeleteUser} onRoleChange={onChangeRole} />
          )}
        </Card>

        <Card
          title="Invites"
          action={
            <div className="flex items-center gap-2">
              <select
                value={creating}
                onChange={(e) => setCreating(e.target.value as Role)}
                className="border border-[var(--color-border)] bg-black/10 px-2 py-1 text-[12.5px] font-semibold"
                style={squircle(10)}
                aria-label="Invite role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={onCreateInvite}
                className="flex items-center gap-1.5 bg-[var(--color-frost)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--color-frost-text)]"
                style={squircle(11)}
              >
                <Icon path={mdiAccountPlus} size={14} />
                New invite
              </button>
            </div>
          }
        >
          {loading ? (
            <p className="m-0 text-[13px] text-[var(--color-muted)]">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="m-0 text-[13px] text-[var(--color-muted)]">No invites yet. Create one to add someone to the home.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {invites.map((inv) => (
                <InviteRow
                  key={inv.token}
                  invite={inv}
                  onDelete={onDeleteInvite}
                  onShare={onShareInvite}
                />
              ))}
            </ul>
          )}
        </Card>

        {sharing && (
          <Card title="Share this invite">
            <div className="flex flex-col items-center gap-3">
              <img src={sharing.qr} alt="QR code for invite link" width={240} height={240} style={squircle(16)} />
              <div className="flex w-full items-center gap-2 border border-[var(--color-border)] px-3 py-2" style={squircle(12)}>
                <code className="flex-1 truncate font-mono text-[12.5px]">{inviteUrl(sharing.invite.token)}</code>
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
                  aria-label="Copy invite link"
                >
                  <Icon path={copied ? mdiCheck : mdiContentCopy} size={14} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">
                Send the link or have them scan the QR code. Expires {new Date(sharing.invite.expiresAt).toLocaleDateString()}.
              </p>
              <button
                type="button"
                onClick={() => setSharing(null)}
                className="text-[12.5px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
