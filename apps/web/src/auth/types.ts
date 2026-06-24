export type Role = 'admin' | 'member';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface Invite {
  token: string;
  role: Role;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
}
