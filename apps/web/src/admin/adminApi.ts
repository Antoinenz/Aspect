export interface AdminSettings {
  effective: {
    url: string | null;
    hasToken: boolean;
    source: 'db' | 'env' | 'none';
  };
  haConnected: boolean;
  lastError: string | null;
  envHasUrl: boolean;
  envHasToken: boolean;
}

export interface SaveSettingsPayload {
  haUrl: string;
  /** Omit to keep the existing stored token. */
  haToken?: string;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}

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

export async function getAdminSettings(): Promise<AdminSettings> {
  return jsonOrThrow(await fetch('/api/admin/settings'));
}

export async function saveAdminSettings(payload: SaveSettingsPayload): Promise<AdminSettings> {
  return jsonOrThrow(
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function resetAdminSettings(): Promise<AdminSettings> {
  return jsonOrThrow(
    await fetch('/api/admin/settings', { method: 'DELETE' }),
  );
}

export async function testAdminConnection(payload: {
  haUrl: string;
  haToken: string;
}): Promise<TestResult> {
  return jsonOrThrow(
    await fetch('/api/admin/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}
