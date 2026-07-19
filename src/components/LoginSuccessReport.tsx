import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { getAuthLog, isAuthDebugEnabled } from '@/utils/authDebug';
import { getConsoleCapture, subscribeConsoleCapture } from '@/utils/consoleCapture';

const FLAG_KEY = 'hims_login_success_report';

export function markLoginSuccess(where: string) {
  try {
    sessionStorage.setItem(
      FLAG_KEY,
      JSON.stringify({ at: Date.now(), where }),
    );
  } catch { /* noop */ }
}

export default function LoginSuccessReport() {
  const { user, profile, session, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [flag, setFlag] = useState<{ at: number; where: string } | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = subscribeConsoleCapture(() => force((n) => n + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;
    if (location.pathname === '/auth') return;
    if (!isAuthDebugEnabled()) return;
    try {
      const raw = sessionStorage.getItem(FLAG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setFlag(parsed);
      setOpen(true);
      sessionStorage.removeItem(FLAG_KEY);
    } catch { /* noop */ }
  }, [loading, user, profile, location.pathname]);

  if (!open || !flag) return null;

  const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;
  const recent = getAuthLog().slice(-8).reverse();
  const debugOn = isAuthDebugEnabled();
  const consoleEntries = getConsoleCapture().slice(-20).reverse();
  const errorCount = consoleEntries.filter((e) => e.level === 'error').length;
  const warnCount = consoleEntries.filter((e) => e.level === 'warn').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md z-[9999] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Login Successful
          </DialogTitle>
          <DialogDescription>
            Session established. Here's your login report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
            <div><span className="text-muted-foreground">user:</span> {user?.email ?? user?.id}</div>
            <div><span className="text-muted-foreground">role:</span> {profile?.role} {profile?.is_active === false && <span className="text-red-500">(inactive)</span>}</div>
            <div><span className="text-muted-foreground">route:</span> {location.pathname}</div>
            <div><span className="text-muted-foreground">signed in via:</span> {flag.where}</div>
            <div><span className="text-muted-foreground">session expires:</span> {expiresAt ? expiresAt.toLocaleString() : '—'}</div>
            <div><span className="text-muted-foreground">login at:</span> {new Date(flag.at).toLocaleTimeString()}</div>
            <div>
              <span className="text-muted-foreground">console:</span>{' '}
              <span className={errorCount > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
                {errorCount} errors
              </span>
              {', '}
              <span className={warnCount > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                {warnCount} warnings
              </span>
            </div>
          </div>

          {consoleEntries.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-[10px] max-h-48 overflow-auto">
              <div className="mb-1 text-muted-foreground">console output (latest {consoleEntries.length}):</div>
              {consoleEntries.map((e, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-words ${e.level === 'error' ? 'text-red-600' : 'text-amber-600'}`}
                >
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>{' '}
                  [{e.level}] {e.message}
                </div>
              ))}
            </div>
          )}

          {debugOn && recent.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-[10px] max-h-40 overflow-auto">
              <div className="mb-1 text-muted-foreground">recent auth events:</div>
              {recent.map((e, i) => (
                <div key={i} className="truncate">
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>{' '}
                  [{e.kind}] {e.where}: {e.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="w-full">Continue to Dashboard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
