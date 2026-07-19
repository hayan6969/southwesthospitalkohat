// Lightweight in-memory auth event log used by the AuthDebugOverlay.
// Everything here is client-only and safe to import from anywhere.

export type AuthDebugEntry = {
  ts: number;
  kind: 'redirect' | 'info' | 'warn';
  where: string;
  message: string;
};

const KEY = '__hims_auth_debug_log__';
const ENABLED_KEY = 'hims_auth_debug_enabled';

type W = Window & {
  [KEY]?: AuthDebugEntry[];
  __hims_auth_debug_listeners__?: Set<() => void>;
};

function store(): AuthDebugEntry[] {
  const w = window as W;
  if (!w[KEY]) w[KEY] = [];
  return w[KEY]!;
}

function listeners(): Set<() => void> {
  const w = window as W;
  if (!w.__hims_auth_debug_listeners__) w.__hims_auth_debug_listeners__ = new Set();
  return w.__hims_auth_debug_listeners__;
}

export function logAuthEvent(entry: Omit<AuthDebugEntry, 'ts'>) {
  if (typeof window === 'undefined') return;
  const arr = store();
  arr.push({ ...entry, ts: Date.now() });
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  // eslint-disable-next-line no-console
  console.log(`[auth-debug] ${entry.where}: ${entry.message}`);
  listeners().forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

export function getAuthLog(): AuthDebugEntry[] {
  if (typeof window === 'undefined') return [];
  return [...store()];
}

export function clearAuthLog() {
  store().length = 0;
  listeners().forEach((fn) => fn());
}

export function subscribeAuthLog(fn: () => void): () => void {
  listeners().add(fn);
  return () => listeners().delete(fn);
}

export function isAuthDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('authdebug') === '1') {
      localStorage.setItem(ENABLED_KEY, '1');
    }
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAuthDebugEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, '1');
    else localStorage.removeItem(ENABLED_KEY);
  } catch { /* noop */ }
  listeners().forEach((fn) => fn());
}
