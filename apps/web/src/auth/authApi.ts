import type { AuthUser, Invite, Role } from './types.js';

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch { /* not JSON */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getMe(): Promise<{ user: AuthUser | null }> {
  return jsonOrThrow(await fetch('/api/auth/me', { credentials: 'same-origin' }));
}

export async function getAuthState(): Promise<{ hasUsers: boolean }> {
  return jsonOrThrow(await fetch('/api/auth/state', { credentials: 'same-origin' }));
}

export async function login(payload: { username: string; password: string }): Promise<{ user: AuthUser }> {
  return jsonOrThrow(await fetch('/api/auth/login', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function signup(payload: {
  username: string; password: string; displayName: string; inviteToken?: string;
}): Promise<{ user: AuthUser }> {
  return jsonOrThrow(await fetch('/api/auth/signup', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function logout(): Promise<{ ok: true }> {
  return jsonOrThrow(await fetch('/api/auth/logout', {
    method: 'POST', credentials: 'same-origin',
  }));
}

// --- Admin user/invite management ---

export async function listUsers(): Promise<{ users: AuthUser[] }> {
  return jsonOrThrow(await fetch('/api/users', { credentials: 'same-origin' }));
}

export async function patchUserRole(id: string, role: Role): Promise<{ user: AuthUser }> {
  return jsonOrThrow(await fetch(`/api/users/${id}`, {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  }));
}

export async function deleteUser(id: string): Promise<{ ok: true }> {
  return jsonOrThrow(await fetch(`/api/users/${id}`, {
    method: 'DELETE', credentials: 'same-origin',
  }));
}

export async function listInvites(): Promise<{ invites: Invite[] }> {
  return jsonOrThrow(await fetch('/api/invites', { credentials: 'same-origin' }));
}

export async function createInvite(role: Role): Promise<{ invite: Invite }> {
  return jsonOrThrow(await fetch('/api/invites', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  }));
}

export async function deleteInvite(token: string): Promise<{ ok: true }> {
  return jsonOrThrow(await fetch(`/api/invites/${encodeURIComponent(token)}`, {
    method: 'DELETE', credentials: 'same-origin',
  }));
}
