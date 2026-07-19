// Capture console errors/warnings globally so the LoginSuccessReport
// and AuthDebugOverlay can surface them without opening DevTools.

export type ConsoleEntry = {
  ts: number;
  level: 'error' | 'warn';
  message: string;
};

const KEY = '__hims_console_capture__';
const LISTENERS = '__hims_console_capture_listeners__';
const INSTALLED = '__hims_console_capture_installed__';

type W = Window & {
  [KEY]?: ConsoleEntry[];
  [LISTENERS]?: Set<() => void>;
  [INSTALLED]?: boolean;
};

function store(): ConsoleEntry[] {
  const w = window as W;
  if (!w[KEY]) w[KEY] = [];
  return w[KEY]!;
}

function listeners(): Set<() => void> {
  const w = window as W;
  if (!w[LISTENERS]) w[LISTENERS] = new Set();
  return w[LISTENERS]!;
}

function fmtArg(a: unknown): string {
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
}

function push(level: 'error' | 'warn', args: unknown[]) {
  const arr = store();
  arr.push({ ts: Date.now(), level, message: args.map(fmtArg).join(' ') });
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  listeners().forEach((fn) => { try { fn(); } catch { /* noop */ } });
}

export function installConsoleCapture() {
  if (typeof window === 'undefined') return;
  const w = window as W;
  if (w[INSTALLED]) return;
  w[INSTALLED] = true;

  const origErr = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => { push('error', args); origErr(...args); };
  console.warn = (...args: unknown[]) => { push('warn', args); origWarn(...args); };

  window.addEventListener('error', (e) => {
    push('error', [e.message || 'window error', e.filename ? `@ ${e.filename}:${e.lineno}` : '']);
  });
  window.addEventListener('unhandledrejection', (e) => {
    push('error', ['unhandled promise rejection:', fmtArg(e.reason)]);
  });
}

export function getConsoleCapture(): ConsoleEntry[] {
  if (typeof window === 'undefined') return [];
  return [...store()];
}

export function clearConsoleCapture() {
  store().length = 0;
  listeners().forEach((fn) => fn());
}

export function subscribeConsoleCapture(fn: () => void): () => void {
  listeners().add(fn);
  return () => listeners().delete(fn);
}
