import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from './AdminPage.js';
import type { AdminSettings } from './adminApi.js';

const baseSettings: AdminSettings = {
  effective: { url: 'http://env-ha:8123', hasToken: true, source: 'env' },
  haConnected: true,
  lastError: null,
  envHasUrl: true,
  envHasToken: true,
};

function mockFetchSequence(responses: Array<{ status?: number; body: unknown }>): void {
  let i = 0;
  global.fetch = vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)]!;
    i++;
    return {
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      statusText: 'OK',
      json: async () => r.body,
    } as Response;
  });
}

describe('AdminPage', () => {
  beforeEach(() => {
    // Silence unhandled confirm() prompts that don't matter to these tests.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows status and effective URL after loading', async () => {
    mockFetchSequence([{ body: baseSettings }]);
    render(<AdminPage onBack={() => {}} />);
    expect(await screen.findByText(/connected to home assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/environment defaults/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://env-ha:8123')).toBeInTheDocument();
  });

  it('renders the security warning', async () => {
    mockFetchSequence([{ body: baseSettings }]);
    render(<AdminPage onBack={() => {}} />);
    expect(await screen.findByText(/no authentication/i)).toBeInTheDocument();
  });

  it('PUTs settings without haToken when the field is left empty', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const path = String(_url);
      if (path === '/api/admin/settings' && (!init || !init.method)) {
        return {
          ok: true, status: 200, statusText: 'OK',
          json: async () => baseSettings,
        } as Response;
      }
      if (path === '/api/admin/settings' && init?.method === 'PUT') {
        return {
          ok: true, status: 200, statusText: 'OK',
          json: async () => ({ ...baseSettings, effective: { ...baseSettings.effective, source: 'db' as const, url: 'http://new:8123' } }),
        } as Response;
      }
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${path}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminPage onBack={() => {}} />);
    const urlField = await screen.findByDisplayValue('http://env-ha:8123');
    await userEvent.clear(urlField);
    await userEvent.type(urlField, 'http://new:8123');
    await userEvent.click(screen.getByRole('button', { name: /save & reconnect/i }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
      expect(putCall).toBeDefined();
      const body = JSON.parse(String((putCall![1] as RequestInit).body));
      expect(body).toEqual({ haUrl: 'http://new:8123' });
      // Token must be absent — otherwise we'd clobber the stored value.
      expect(Object.prototype.hasOwnProperty.call(body, 'haToken')).toBe(false);
    });
  });

  it('PUTs the new haToken when the field is filled in', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const path = String(_url);
      if (path === '/api/admin/settings' && (!init || !init.method)) {
        return { ok: true, status: 200, statusText: 'OK', json: async () => baseSettings } as Response;
      }
      return { ok: true, status: 200, statusText: 'OK', json: async () => baseSettings } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminPage onBack={() => {}} />);
    await screen.findByDisplayValue('http://env-ha:8123');
    const tokenField = screen.getByPlaceholderText(/configured/i);
    await userEvent.type(tokenField, 'fresh-token');
    await userEvent.click(screen.getByRole('button', { name: /save & reconnect/i }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
      expect(putCall).toBeDefined();
      const body = JSON.parse(String((putCall![1] as RequestInit).body));
      expect(body).toEqual({ haUrl: 'http://env-ha:8123', haToken: 'fresh-token' });
    });
  });

  it('shows a success toast when test-connection succeeds', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      if (String(_url).endsWith('/test-connection')) {
        return { ok: true, status: 200, statusText: 'OK', json: async () => ({ ok: true }) } as Response;
      }
      return { ok: true, status: 200, statusText: 'OK', json: async () => baseSettings } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminPage onBack={() => {}} />);
    await screen.findByDisplayValue('http://env-ha:8123');
    await userEvent.type(screen.getByPlaceholderText(/configured/i), 'tok');
    await userEvent.click(screen.getByRole('button', { name: /^test$/i }));

    expect(await screen.findByText(/test succeeded/i)).toBeInTheDocument();
  });

  it('renders the error from test-connection when it fails', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      if (String(_url).endsWith('/test-connection')) {
        return {
          ok: true, status: 200, statusText: 'OK',
          json: async () => ({ ok: false, error: 'Invalid auth' }),
        } as Response;
      }
      return { ok: true, status: 200, statusText: 'OK', json: async () => baseSettings } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminPage onBack={() => {}} />);
    await screen.findByDisplayValue('http://env-ha:8123');
    await userEvent.type(screen.getByPlaceholderText(/configured/i), 'tok');
    await userEvent.click(screen.getByRole('button', { name: /^test$/i }));

    expect(await screen.findByText(/invalid auth/i)).toBeInTheDocument();
  });

  it('shows the Revert button only when source=db and env is present', async () => {
    const dbBase: AdminSettings = {
      ...baseSettings,
      effective: { url: 'http://override:8123', hasToken: true, source: 'db' },
    };
    mockFetchSequence([{ body: dbBase }]);
    render(<AdminPage onBack={() => {}} />);
    expect(await screen.findByRole('button', { name: /revert to env defaults/i })).toBeInTheDocument();
  });

  it('does not show Revert when there is nothing to revert to', async () => {
    const noEnv: AdminSettings = {
      ...baseSettings,
      effective: { url: 'http://override:8123', hasToken: true, source: 'db' },
      envHasUrl: false, envHasToken: false,
    };
    mockFetchSequence([{ body: noEnv }]);
    render(<AdminPage onBack={() => {}} />);
    await screen.findByDisplayValue('http://override:8123');
    expect(screen.queryByRole('button', { name: /revert to env defaults/i })).not.toBeInTheDocument();
  });

  it('invokes onBack when the back button is clicked', async () => {
    mockFetchSequence([{ body: baseSettings }]);
    const onBack = vi.fn();
    render(<AdminPage onBack={onBack} />);
    await screen.findByDisplayValue('http://env-ha:8123');
    await userEvent.click(screen.getByRole('button', { name: /back to settings/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
