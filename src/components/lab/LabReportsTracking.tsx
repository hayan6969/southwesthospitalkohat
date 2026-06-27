import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Receipt, FileText, TrendingUp, Printer, FileSpreadsheet, Search, Filter, Loader2 } from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, format,
} from "date-fns";
import { formatInPakistanTime, getCurrentPakistanDate } from "@/utils/timezone";
import { formatPkrAmount } from "@/utils/currency";
import { generateLabRegisterPDF, type LabRegisterRow, type LabRegisterSummary } from "@/utils/labRegisterPdfGenerator";
import { exportLabRegisterToCSV } from "@/utils/exportUtils";
import { toast } from "sonner";

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";

// A report fetched from the DB, before serial numbering / search filtering.
interface RawRow {
  id: string;
  reportNumber: string;
  date: string;
  patientId: string;
  patientName: string;
  referredBy: string;
  tests: string[];
  charges: number;
  status: string;
}

const localDate = (ymd: string) => new Date(`${ymd}T00:00:00`);

export function LabReportsTracking() {
  const today = getCurrentPakistanDate(); // yyyy-MM-dd
  const [period, setPeriod] = useState<Period>("daily");
  const [anchor, setAnchor] = useState<string>(today);
  const [customFrom, setCustomFrom] = useState<string>(today);
  const [customTo, setCustomTo] = useState<string>(today);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();
  const PAGE_SIZE = 15;

  // ── Resolve the active date range + a human label ───────────────────────────
  const { startISO, endISO, periodLabel } = useMemo(() => {
    let start: Date, end: Date, label: string;
    const a = anchor ? localDate(anchor) : new Date();
    switch (period) {
      case "daily":
        start = startOfDay(a); end = endOfDay(a);
        label = format(a, "dd/MM/yyyy");
        break;
      case "weekly":
        start = startOfWeek(a, { weekStartsOn: 1 }); end = endOfWeek(a, { weekStartsOn: 1 });
        label = `${format(start, "dd/MM/yyyy")} – ${format(end, "dd/MM/yyyy")}`;
        break;
      case "monthly":
        start = startOfMonth(a); end = endOfMonth(a);
        label = format(a, "MMMM yyyy");
        break;
      case "yearly":
        start = startOfYear(a); end = endOfYear(a);
        label = format(a, "yyyy");
        break;
      case "custom":
      default: {
        const f = customFrom ? localDate(customFrom) : new Date();
        const t = customTo ? localDate(customTo) : new Date();
        start = startOfDay(f); end = endOfDay(t);
        label = `${format(start, "dd/MM/yyyy")} – ${format(end, "dd/MM/yyyy")}`;
      }
    }
    return { startISO: start.toISOString(), endISO: end.toISOString(), periodLabel: label };
  }, [period, anchor, customFrom, customTo]);

  useEffect(() => { setPage(1); }, [startISO, endISO, search]);

  // ── Fetch every report in range (paged internally), with tests + prices ─────
  const { data: rawRows, isLoading, isError } = useQuery<RawRow[]>({
    queryKey: ["lab_register", startISO, endISO],
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const FETCH = 1000;
      let fromIdx = 0;
      const all: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("lab_pathology_reports")
          .select("id, report_number, patient_id, patient_name_snapshot, referred_by, status, created_at, amount, lab_pathology_report_test_types(price_snapshot, lab_test_types(name, price))")
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .order("created_at", { ascending: true })
          .range(fromIdx, fromIdx + FETCH - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < FETCH) break;
        fromIdx += FETCH;
      }

      // Resolve friendly patient numbers (no FK metadata → fetch separately).
      const pids = Array.from(new Set(all.map((r) => r.patient_id).filter(Boolean)));
      const patientMap = new Map<string, string>();
      for (let i = 0; i < pids.length; i += 200) {
        const chunk = pids.slice(i, i + 200);
        const { data: pats } = await supabase.from("patients").select("id, patient_number").in("id", chunk);
        (pats ?? []).forEach((p: any) => { if (p.patient_number) patientMap.set(p.id, p.patient_number); });
      }

      // Fetch consumed lab discounts in the same range so we can adjust
      // charges for reports whose stored amount does not yet reflect the
      // discount (e.g. invoices created before StaffPathologyBilling
      // applied discounts at checkout).
      const { data: usedDiscounts } = await supabase
        .from("patient_discounts")
        .select("patient_id, discount_type, discount_value, used_at")
        .eq("service_type", "lab")
        .not("used_at", "is", null)
        .gte("used_at", startISO)
        .lte("used_at", endISO);
      // Group discounts by patient_id + used_at date
      const discountMap = new Map<string, { discount_type: string; discount_value: number }[]>();
      (usedDiscounts ?? []).forEach((d: any) => {
        const dateKey = d.used_at?.split("T")[0] ?? "";
        const key = `${d.patient_id}|${dateKey}`;
        const arr = discountMap.get(key) || [];
        arr.push({ discount_type: d.discount_type, discount_value: Number(d.discount_value ?? 0) });
        discountMap.set(key, arr);
      });

      return all.map((r: any): RawRow => {
        const tts = (r.lab_pathology_report_test_types ?? []) as any[];
        const tests = tts.map((t) => t.lab_test_types?.name).filter(Boolean) as string[];
        const reportAmount = r.amount != null ? Number(r.amount) : 0;
        const snapshotCharges = tts.reduce((sum, t) => sum + (Number(t.price_snapshot) || 0), 0);
        const catalogCharges = tts.reduce((sum, t) => sum + (Number(t.lab_test_types?.price) || 0), 0);
        let charges = reportAmount > 0 ? reportAmount
                     : snapshotCharges > 0 ? snapshotCharges
                     : catalogCharges;

        // If a lab discount was consumed for this patient on the same day,
        // the stored amount may not reflect it yet (legacy invoices).
        const reportDate = r.created_at?.split("T")[0] ?? "";
        const matchKey = `${r.patient_id}|${reportDate}`;
        const discounts = discountMap.get(matchKey);
        if (discounts && discounts.length > 0) {
          let totalDiscount = 0;
          for (const d of discounts) {
            if (d.discount_type === "percentage") {
              totalDiscount += Math.round((charges * d.discount_value) / 100);
            } else {
              totalDiscount += Math.min(d.discount_value, charges);
            }
          }
          charges = Math.max(0, charges - totalDiscount);
        }

        return {
          id: r.id,
          reportNumber: r.report_number ?? "—",
          date: r.created_at,
          patientId: patientMap.get(r.patient_id) ?? "—",
          patientName: r.patient_name_snapshot ?? "—",
          referredBy: r.referred_by ?? "—",
          tests,
          charges,
          status: r.status ?? "",
        };
      });
    },
  });

  // ── Apply text search, then number the rows ─────────────────────────────────
  const rows: LabRegisterRow[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (rawRows ?? []).filter((r) => {
      if (!q) return true;
      return (
        r.reportNumber.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.referredBy.toLowerCase().includes(q) ||
        r.tests.some((t) => t.toLowerCase().includes(q))
      );
    });
    return filtered.map((r, i) => ({
      serial: i + 1,
      reportNumber: r.reportNumber,
      date: r.date,
      patientId: r.patientId,
      patientName: r.patientName,
      referredBy: r.referredBy,
      tests: r.tests,
      charges: r.charges,
    }));
  }, [rawRows, search]);

  const summary: LabRegisterSummary = useMemo(() => {
    const totalCharges = rows.reduce((s, r) => s + r.charges, 0);
    const counts = new Map<string, number>();
    rows.forEach((r) => r.tests.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    let topTest = "—", topCount = 0;
    counts.forEach((c, name) => { if (c > topCount) { topCount = c; topTest = name; } });
    return {
      totalReports: rows.length,
      totalCharges,
      topTest: topCount ? `${topTest} (${topCount})` : "—",
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Refetch fresh data so deleted/updated reports never linger in the PDF.
      const fresh = await queryClient.fetchQuery<RawRow[]>({ queryKey: ["lab_register", startISO, endISO], staleTime: 0 });
      const q = search.trim().toLowerCase();
      const filtered = (fresh ?? []).filter((r) => {
        if (!q) return true;
        return (
          r.reportNumber.toLowerCase().includes(q) ||
          r.patientName.toLowerCase().includes(q) ||
          r.patientId.toLowerCase().includes(q) ||
          r.referredBy.toLowerCase().includes(q) ||
          r.tests.some((t) => t.toLowerCase().includes(q))
        );
      });
      const freshRows: LabRegisterRow[] = filtered.map((r, i) => ({
        serial: i + 1,
        reportNumber: r.reportNumber,
        date: r.date,
        patientId: r.patientId,
        patientName: r.patientName,
        referredBy: r.referredBy,
        tests: r.tests,
        charges: r.charges,
      }));
      const freshTotalCharges = freshRows.reduce((s, r) => s + r.charges, 0);
      const counts = new Map<string, number>();
      freshRows.forEach((r) => r.tests.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
      let topTest = "—", topCount = 0;
      counts.forEach((c, name) => { if (c > topCount) { topCount = c; topTest = name; } });
      const freshSummary: LabRegisterSummary = {
        totalReports: freshRows.length,
        totalCharges: freshTotalCharges,
        topTest: topCount ? `${topTest} (${topCount})` : "—",
      };
      await generateLabRegisterPDF({ rows: freshRows, summary: freshSummary, periodLabel });
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    try {
      exportLabRegisterToCSV(rows, summary, periodLabel);
    } catch (e: any) {
      toast.error(e?.message || "Failed to export CSV");
    }
  };

  const resetFilters = () => {
    setPeriod("daily");
    setAnchor(today);
    setCustomFrom(today);
    setCustomTo(today);
    setSearch("");
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Total Reports</div>
              <div className="text-2xl font-bold">{isLoading ? "…" : summary.totalReports}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2"><Receipt className="w-5 h-5 text-green-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Total Charges</div>
              <div className="text-2xl font-bold">{isLoading ? "…" : formatPkrAmount(summary.totalCharges)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Top Test</div>
              <div className="text-lg font-bold truncate max-w-[200px]" title={summary.topTest}>{isLoading ? "…" : summary.topTest}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Lab Reports Register
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" ? (
              <>
                <div><Label>From</Label><Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
                <div><Label>To</Label><Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
              </>
            ) : (
              <div>
                <Label>{period === "yearly" ? "Pick any date in the year" : period === "monthly" ? "Pick any date in the month" : period === "weekly" ? "Pick any date in the week" : "Date"}</Label>
                <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
              </div>
            )}

            <div className={period === "custom" ? "md:col-span-1" : "md:col-span-2"}>
              <Label>Search (report #, patient, referred by, test)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter…" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Showing <b>{periodLabel}</b> · charges reflect actual invoice amounts (discounts included).
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <Filter className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={handleCsv} disabled={rows.length === 0}>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> CSV
              </Button>
              <Button size="sm" onClick={handlePdf} disabled={rows.length === 0 || exporting}>
                {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1" />}
                {exporting ? "Generating…" : "Print / PDF"}
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
                  <TableHead className="w-12">S/N</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Report #</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6">Loading…</TableCell></TableRow>}
                {isError && !isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6 text-red-600">Failed to load reports.</TableCell></TableRow>}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No reports found for this period.</TableCell></TableRow>
                )}
                {pageRows.map((r) => (
                  <TableRow key={`${r.reportNumber}-${r.serial}`}>
                    <TableCell className="text-xs text-muted-foreground">{r.serial}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.date ? formatInPakistanTime(r.date, "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reportNumber}</TableCell>
                    <TableCell className="text-xs">{r.patientId}</TableCell>
                    <TableCell className="text-sm">{r.patientName}</TableCell>
                    <TableCell className="text-xs">{r.referredBy}</TableCell>
                    <TableCell className="text-xs max-w-[260px]">
                      <div className="flex flex-wrap gap-1">
                        {r.tests.length === 0 ? "—" : r.tests.map((t, i) => (
                          <Badge key={i} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/60">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">{formatPkrAmount(r.charges)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {rows.length} report{rows.length === 1 ? "" : "s"} · Total {formatPkrAmount(summary.totalCharges)}
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
  );
}
