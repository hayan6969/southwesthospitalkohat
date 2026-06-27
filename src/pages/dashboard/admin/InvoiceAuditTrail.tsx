import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileSpreadsheet, ClipboardList, Receipt, DollarSign, RotateCcw } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { formatInPakistanTime, getCurrentPakistanDate } from "@/utils/timezone";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";

type Operation = "created" | "updated" | "deleted" | "";

interface AuditRow {
  id: string;
  invoice_id: string;
  invoice_number: string;
  operation: string;
  changed_by_name: string;
  changed_at: string;
  old_amount: number | null;
  new_amount: number | null;
  old_status: string | null;
  new_status: string | null;
  old_row: any;
  new_row: any;
  changed_fields: string[];
  authorizedBy: string;
}

const localDate = (ymd: string) => new Date(`${ymd}T00:00:00`);

const operationBadge = (op: string) => {
  switch (op) {
    case "created": return <Badge className="bg-green-100 text-green-800 border-green-200">Created</Badge>;
    case "updated": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Edited</Badge>;
    case "deleted": return <Badge className="bg-red-100 text-red-800 border-red-200">Deleted</Badge>;
    default: return <Badge>{op}</Badge>;
  }
};

export default function InvoiceAuditTrail() {
  const today = getCurrentPakistanDate();
  const [filterMode, setFilterMode] = useState<"daily" | "range" | "preset">("daily");
  const [anchor, setAnchor] = useState<string>(today);
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(today);
  const [preset, setPreset] = useState<string>("today");
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState<Operation>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { startISO, endISO } = useMemo(() => {
    let start: Date, end: Date;
    const a = anchor ? localDate(anchor) : new Date();
    switch (filterMode) {
      case "daily":
        start = startOfDay(a); end = endOfDay(a);
        break;
      case "range":
        start = startOfDay(localDate(from || today)); end = endOfDay(localDate(to || today));
        break;
      case "preset": {
        const now = localDate(today);
        switch (preset) {
          case "today": start = startOfDay(now); end = endOfDay(now); break;
          case "yesterday": { const y = subDays(now, 1); start = startOfDay(y); end = endOfDay(y); break; }
          case "this-week": start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
          case "this-month": start = startOfMonth(now); end = endOfMonth(now); break;
          default: start = startOfDay(now); end = endOfDay(now);
        }
        break;
      }
      default: start = startOfDay(a); end = endOfDay(a);
    }
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [filterMode, anchor, from, to, preset, today]);

  useEffect(() => { setPage(1); }, [startISO, endISO, search, opFilter]);

  const { data: auditRows, isLoading, isError } = useQuery<AuditRow[]>({
    queryKey: ["invoice_audit_log", startISO, endISO],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_audit_log")
        .select("id, invoice_id, invoice_number, operation, changed_by, changed_at, old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields")
        .gte("changed_at", startISO)
        .lte("changed_at", endISO)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data ?? []).map((r) => r.changed_by).filter(Boolean)));
      const userMap = new Map<string, string>();
      for (let i = 0; i < userIds.length; i += 200) {
        const chunk = userIds.slice(i, i + 200);
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", chunk);
        (profiles ?? []).forEach((p: any) => {
          userMap.set(p.id, `${p.first_name} ${p.last_name}`);
        });
      }

      return (data ?? []).map((r: any): AuditRow => ({
        id: r.id,
        invoice_id: r.invoice_id,
        invoice_number: r.invoice_number || "—",
        operation: r.operation,
        changed_by_name: r.changed_by ? (userMap.get(r.changed_by) || "System") : "System",
        changed_at: r.changed_at,
        old_amount: r.old_amount,
        new_amount: r.new_amount,
        old_status: r.old_status,
        new_status: r.new_status,
        old_row: r.old_row,
        new_row: r.new_row,
        changed_fields: r.changed_fields || [],
        authorizedBy: (() => {
          const desc = (r.new_row?.description || r.old_row?.description || "") as string;
          const m = desc.match(/\[Authorized by:\s*([^\]]*)\]/i);
          return m ? m[1].trim() : "";
        })(),
      }));
    },
  });

  const filteredRows = useMemo(() => {
    let rows = auditRows ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.invoice_number.toLowerCase().includes(q));
    }
    if (opFilter) {
      rows = rows.filter((r) => r.operation === opFilter);
    }
    return rows;
  }, [auditRows, search, opFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summaryCards = useMemo(() => {
    const todayStart = startOfDay(localDate(today)).toISOString();
    const todayEnd = endOfDay(localDate(today)).toISOString();
    const todayRows = (auditRows ?? []).filter((r) => r.changed_at >= todayStart && r.changed_at <= todayEnd);
    const editedToday = todayRows.filter((r) => r.operation === "updated").length;
    const cancelledToday = todayRows.filter((r) => r.new_status === "cancelled" || (r.old_status === "paid" && r.new_status === "cancelled")).length;
    const discountTotal = todayRows
      .filter((r) => r.operation === "updated" && r.old_amount != null && r.new_amount != null && r.new_amount < r.old_amount)
      .reduce((sum, r) => sum + ((r.old_amount ?? 0) - (r.new_amount ?? 0)), 0);
    return { editedToday, cancelledToday, discountTotal };
  }, [auditRows, today]);

  const handleCsv = () => {
    try {
      const header = ["Time", "Invoice #", "Operation", "Changed By", "Authorized By", "Old Amount", "New Amount", "Old Status", "New Status", "Changed Fields"];
      const csvRows = [header];
      for (const r of filteredRows) {
        csvRows.push([
          r.changed_at ? formatInPakistanTime(r.changed_at, "yyyy-MM-dd HH:mm:ss") : "",
          r.invoice_number,
          r.operation,
          r.changed_by_name,
          r.authorizedBy,
          r.old_amount != null ? String(r.old_amount) : "",
          r.new_amount != null ? String(r.new_amount) : "",
          r.old_status || "",
          r.new_status || "",
          (r.changed_fields || []).join("; "),
        ]);
      }
      const csvContent = csvRows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-audit-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to export CSV");
    }
  };

  const resetFilters = () => {
    setFilterMode("daily");
    setAnchor(today);
    setFrom(today);
    setTo(today);
    setPreset("today");
    setSearch("");
    setOpFilter("");
  };

  const statusDiff = (oldS: string | null, newS: string | null) => {
    if (!oldS && !newS) return "—";
    if (oldS === newS || !oldS) return newS || "—";
    if (!newS) return oldS;
    return <span>{oldS} <span className="text-gray-400">→</span> {newS}</span>;
  };

  const amountDiff = (oldA: number | null, newA: number | null) => {
    if (oldA == null && newA == null) return "—";
    if (oldA == null) return formatPkrAmount(newA ?? 0);
    if (newA == null) return formatPkrAmount(oldA);
    if (oldA === newA) return formatPkrAmount(oldA);
    return (
      <span>
        <span className="text-red-600 line-through">{formatPkrAmount(oldA)}</span>
        <span className="text-gray-400 mx-1">→</span>
        <span className="text-green-600">{formatPkrAmount(newA)}</span>
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Audit Trail</h1>
          <p className="text-gray-600 mt-1">Track every invoice change — created, edited, cancelled</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><ClipboardList className="w-5 h-5 text-blue-600" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Edited Today</div>
                <div className="text-2xl font-bold">{summaryCards.editedToday}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><RotateCcw className="w-5 h-5 text-red-600" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Cancelled Today</div>
                <div className="text-2xl font-bold">{summaryCards.cancelledToday}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2"><DollarSign className="w-5 h-5 text-amber-600" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Discounts Today</div>
                <div className="text-2xl font-bold">{formatPkrAmount(summaryCards.discountTotal)}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2"><Receipt className="w-5 h-5 text-green-600" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Total in View</div>
                <div className="text-2xl font-bold">{filteredRows.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Date Mode</Label>
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "daily" | "range" | "preset")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                    <SelectItem value="preset">Quick Presets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterMode === "daily" && (
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
                </div>
              )}
              {filterMode === "range" && (
                <>
                  <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                  <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                </>
              )}
              {filterMode === "preset" && (
                <div>
                  <Label>Preset</Label>
                  <Select value={preset} onValueChange={setPreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Operation</Label>
                <Select value={opFilter} onValueChange={(v) => setOpFilter(v as Operation)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Edited</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Search Invoice #</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice number…" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Defaults to <b>today</b> (Pakistan time) — use filters to browse history.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <Filter className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Button variant="outline" size="sm" onClick={handleCsv} disabled={filteredRows.length === 0}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changed Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading…</TableCell></TableRow>}
                  {isError && !isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-red-600">Failed to load audit trail.</TableCell></TableRow>}
                  {!isLoading && !isError && filteredRows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No changes found for this period.</TableCell></TableRow>
                  )}
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.changed_at ? formatInPakistanTime(r.changed_at, "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                      <TableCell>{operationBadge(r.operation)}</TableCell>
                      <TableCell className="text-xs">{r.changed_by_name}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{amountDiff(r.old_amount, r.new_amount)}</TableCell>
                      <TableCell className="text-xs">{statusDiff(r.old_status, r.new_status)}</TableCell>
                      <TableCell className="text-xs">
                        {r.changed_fields.length > 0
                          ? r.changed_fields.map((f) => (
                              <Badge key={f} variant="outline" className="mr-1 border-gray-300 text-gray-600">{f}</Badge>
                            ))
                          : "—"}
                        {r.authorizedBy && (
                          <div className="text-[11px] text-amber-700 mt-1">Authorized by: <span className="font-medium">{r.authorizedBy}</span></div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRows.length > 0 && (
              <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
                <div className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {filteredRows.length} entries
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
