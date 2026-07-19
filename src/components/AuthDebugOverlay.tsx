import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getAuthLog,
  subscribeAuthLog,
  clearAuthLog,
  isAuthDebugEnabled,
  setAuthDebugEnabled,
  type AuthDebugEntry,
} from '@/utils/authDebug';

// Format HH:MM:SS.mmm for compactness in the overlay.
function fmt(ts: number) {
  const d = new Date(ts);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export default function AuthDebugOverlay() {
  const { user, profile, session, loading } = useAuth();
  const location = useLocation();
  const [, force] = useState(0);
  const [open, setOpen] = useState(true);
  const [enabled, setEnabled] = useState(isAuthDebugEnabled());

  useEffect(() => {
    const unsub = subscribeAuthLog(() => force((n) => n + 1));
    const onStorage = () => setEnabled(isAuthDebugEnabled());
    window.addEventListener('storage', onStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!enabled) return null;

  const log: AuthDebugEntry[] = getAuthLog().slice(-40).reverse();
  const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;

  return (
    <div
      style={{ zIndex: 2147483000 }}
      className="fixed bottom-3 right-3 max-w-[380px] w-[92vw] font-mono text-[11px]"
    >
      <div className="rounded-lg border border-emerald-500/60 bg-black/85 text-emerald-100 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b border-emerald-500/40 px-3 py-1.5">
          <span className="font-semibold text-emerald-300">auth-debug</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded border border-emerald-500/50 px-1.5 py-0.5 text-emerald-200 hover:bg-emerald-500/20"
            >
              {open ? 'hide' : 'show'}
            </button>
            <button
              type="button"
              onClick={clearAuthLog}
              className="rounded border border-emerald-500/50 px-1.5 py-0.5 text-emerald-200 hover:bg-emerald-500/20"
            >
              clear
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthDebugEnabled(false);
                setEnabled(false);
              }}
              className="rounded border border-red-400/60 px-1.5 py-0.5 text-red-200 hover:bg-red-500/20"
            >
              off
            </button>
          </div>
        </div>
        {open && (
          <div className="max-h-[55vh] overflow-auto p-3 leading-relaxed">
            <div>
              <span className="text-emerald-400">loading:</span>{' '}
              <span className={loading ? 'text-amber-300' : 'text-emerald-200'}>{String(loading)}</span>
            </div>
            <div>
              <span className="text-emerald-400">user:</span>{' '}
              {user ? user.email ?? user.id : <span className="text-red-300">null</span>}
            </div>
            <div>
              <span className="text-emerald-400">role:</span>{' '}
              {profile?.role ?? <span className="text-red-300">null</span>}
              {profile && !profile.is_active && <span className="text-red-300"> (inactive)</span>}
            </div>
            <div>
              <span className="text-emerald-400">session exp:</span>{' '}
              {expiresAt ? expiresAt.toLocaleTimeString() : '—'}
            </div>
            <div className="truncate">
              <span className="text-emerald-400">route:</span> {location.pathname}
              {location.search}
            </div>
            <div className="my-2 h-px bg-emerald-500/30" />
            <div className="text-emerald-300">recent events ({log.length}):</div>
            {log.length === 0 && <div className="text-emerald-100/60">— none yet —</div>}
            {log.map((e, i) => (
              <div key={i} className="mt-0.5 whitespace-pre-wrap break-words">
                <span className="text-emerald-500">{fmt(e.ts)}</span>{' '}
                <span
                  className={
                    e.kind === 'redirect'
                      ? 'text-amber-300'
                      : e.kind === 'warn'
                      ? 'text-red-300'
                      : 'text-emerald-200'
                  }
                >
                  [{e.kind}]
                </span>{' '}
                <span className="text-emerald-100">{e.where}</span>{' '}
                <span className="text-emerald-100/80">{e.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
