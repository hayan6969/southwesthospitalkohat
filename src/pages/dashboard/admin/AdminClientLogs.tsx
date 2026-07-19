import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatInPakistanTime } from '@/utils/timezone';

type LogRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  level: 'error' | 'warn';
  message: string;
  route: string | null;
  user_agent: string | null;
  url: string | null;
  occurred_at: string;
};

export default function AdminClientLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warn'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('client_error_logs')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (levelFilter !== 'all') q = q.eq('level', levelFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as LogRow[]);
    } catch (e: any) {
      toast({ title: 'Failed to load logs', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  const clearAll = async () => {
    if (!confirm('Delete ALL client error logs? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('client_error_logs').delete().not('id', 'is', null);
      if (error) throw error;
      toast({ title: 'Logs cleared' });
      fetchLogs();
    } catch (e: any) {
      toast({ title: 'Failed to clear', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.message.toLowerCase().includes(s) ||
      (r.user_email ?? '').toLowerCase().includes(s) ||
      (r.route ?? '').toLowerCase().includes(s) ||
      (r.user_role ?? '').toLowerCase().includes(s)
    );
  });

  const errorCount = rows.filter((r) => r.level === 'error').length;
  const warnCount = rows.filter((r) => r.level === 'warn').length;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Client Error Logs</h1>
          <p className="text-sm text-muted-foreground">
            Console errors and warnings captured from users' browsers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{warnCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search message / email / route / role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="error">Errors only</SelectItem>
            <SelectItem value="warn">Warnings only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto divide-y">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading...' : 'No logs match your filters.'}
              </div>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="p-3 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.level === 'error' ? 'destructive' : 'secondary'}>
                      {r.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatInPakistanTime(r.occurred_at)}
                    </span>
                    {r.user_email && (
                      <span className="text-xs">
                        <span className="text-muted-foreground">user:</span> {r.user_email}
                        {r.user_role && <span className="text-muted-foreground"> ({r.user_role})</span>}
                      </span>
                    )}
                    {r.route && (
                      <span className="text-xs">
                        <span className="text-muted-foreground">route:</span> {r.route}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 font-mono text-xs whitespace-pre-wrap break-words">
                  {r.message}
                </div>
                {r.user_agent && (
                  <div className="mt-1 text-[10px] text-muted-foreground truncate">
                    {r.user_agent}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
