import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Search, Printer, Eye, Filter, Lock, Edit, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { generatePathologyReportPDF, type PathologyPdfData } from "@/utils/pathologyPdfGenerator";
import { toast } from "sonner";
import { isReportLocked, formatRemainingTime } from "@/utils/reportLock";

export function PathologyReportHistory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("all");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types_filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_types").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Debounce the search box so we don't refetch on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const REPORTS_PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  // Jump back to the first page whenever the filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, status, from, to, testTypeFilter]);

  const { data: reportsResult, isLoading } = useQuery({
    queryKey: ["pathology_reports", debouncedSearch, status, from, to, testTypeFilter, page],
    placeholderData: (prev) => prev, // keep current page visible while the next loads
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const trimmed = debouncedSearch;

      // Resolve patient-number matches → patient ids (so search covers the Patient ID column)
      let patientIdMatches: string[] = [];
      if (trimmed) {
        const { data: pats } = await supabase
          .from("patients")
          .select("id")
          .ilike("patient_number", `%${trimmed}%`)
          .limit(50);
        patientIdMatches = (pats ?? []).map((p: any) => p.id);
      }

      const fromIdx = (page - 1) * REPORTS_PAGE_SIZE;

      // Step 1: server-side filter + paginate → just the matching report ids for this page + total count.
      // Lightweight (no heavy joins), so search/paging is fast even with thousands of reports.
      let idq = supabase
        .from("lab_pathology_reports")
        .select(
          testTypeFilter !== "all" ? "id, lab_pathology_report_test_types!inner(test_type_id)" : "id",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (status !== "all") idq = idq.eq("status", status);
      if (from) idq = idq.gte("created_at", new Date(from).toISOString());
      if (to) {
        const end = new Date(to); end.setHours(23, 59, 59, 999);
        idq = idq.lte("created_at", end.toISOString());
      }
      if (testTypeFilter !== "all") idq = idq.eq("lab_pathology_report_test_types.test_type_id", testTypeFilter);
      if (trimmed) {
        // Sanitize for PostgREST or() syntax (commas/parens break the filter string)
        const safe = trimmed.replace(/[,()]/g, " ").trim();
        const orParts: string[] = [];
        if (safe) {
          orParts.push(`report_number.ilike.%${safe}%`);
          orParts.push(`patient_name_snapshot.ilike.%${safe}%`);
        }
        if (patientIdMatches.length) orParts.push(`patient_id.in.(${patientIdMatches.join(",")})`);
        if (orParts.length) idq = idq.or(orParts.join(","));
      }

      const { data: idRows, error: idErr, count } = await idq.range(fromIdx, fromIdx + REPORTS_PAGE_SIZE - 1);
      if (idErr) throw idErr;
      const ids = (idRows ?? []).map((r: any) => r.id);
      if (ids.length === 0) return { rows: [] as any[], count: count ?? 0 };

      // Step 2: fetch the full nested data for just this page's ids (≤10 rows)
      const { data: full, error: fErr } = await supabase
        .from("lab_pathology_reports")
        .select("id, report_number, patient_id, patient_name_snapshot, patient_age_snapshot, patient_sex_snapshot, referred_by, status, reported_at, created_at, lab_pathology_report_test_types(test_type_id, lab_test_types(name)), lab_pathology_report_results(result_value, lab_test_parameters(test_type_id))")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (fErr) throw fErr;
      return { rows: (full as any[]) ?? [], count: count ?? 0 };
    },
  });
  const reports = reportsResult?.rows;
  const reportsTotal = reportsResult?.count ?? 0;
  const reportsTotalPages = Math.max(1, Math.ceil(reportsTotal / REPORTS_PAGE_SIZE));

  const getTestStatuses = (r: any): { name: string; done: boolean }[] => {
    const tts = r.lab_pathology_report_test_types || [];
    const results = r.lab_pathology_report_results || [];
    return tts.map((tt: any) => {
      const ttId = tt.test_type_id;
      const hasResult = results.some((res: any) =>
        res.lab_test_parameters?.test_type_id === ttId &&
        res.result_value !== null && res.result_value !== ""
      );
      return { name: tt.lab_test_types?.name ?? "—", done: hasResult };
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-blue-600" /> Lab Report History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Label>Search (Report #, Patient ID or Name)</Label>
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
              </div>
            </div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label>Test Type</Label>
              <Select value={testTypeFilter} onValueChange={setTestTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="all">All test types</SelectItem>
                  {testTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatus("all"); setFrom(""); setTo(""); setTestTypeFilter("all"); }}>
                <Filter className="w-3.5 h-3.5 mr-1" /> Reset filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Age/Sex</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6">Loading…</TableCell></TableRow>}
                {!isLoading && reports?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No reports found.</TableCell></TableRow>}
                {reports?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.report_number}</TableCell>
                    <TableCell>{r.patient_name_snapshot || "—"}</TableCell>
                    <TableCell className="text-xs">{r.patient_age_snapshot ?? "—"} / {r.patient_sex_snapshot ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[260px]">
                      <div className="flex flex-wrap gap-1">
                        {getTestStatuses(r).map((t, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className={t.done
                              ? "border-green-500 text-green-700 bg-green-50"
                              : "border-amber-500 text-amber-700 bg-amber-50"}
                          >
                            {t.name} · {t.done ? "Done" : "Pending"}
                          </Badge>
                        ))}
                        {getTestStatuses(r).length === 0 && "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.referred_by || "—"}</TableCell>
                    <TableCell className="text-xs">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={r.status === "final" ? "default" : r.status === "partial" ? "outline" : "secondary"} className={r.status === "partial" ? "border-amber-500 text-amber-700" : ""}>{r.status}</Badge>
                        {r.created_at && isReportLocked(r.created_at) ? (
                          <Badge variant="outline" className="border-red-400 text-red-600 text-[10px] flex items-center gap-0.5"><Lock className="w-3 h-3" /> Locked</Badge>
                        ) : r.created_at && r.status === "final" ? (
                          <Badge variant="outline" className="border-green-400 text-green-600 text-[10px]">{formatRemainingTime(r.created_at)}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewingId(r.id)}><Eye className="w-3.5 h-3.5" /></Button>
                      {r.created_at && !isReportLocked(r.created_at) && r.status === "final" && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`?tab=pathology&edit=${r.id}`)}><Edit className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={printingId === r.id}
                        onClick={async () => {
                          if (printingId) return;
                          setPrintingId(r.id);
                          try { await reprintReport(r.id); }
                          finally { setPrintingId(null); }
                        }}
                      >
                        {printingId === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Printer className="w-3.5 h-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {reportsTotal > 0 && (
            <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                Page {page} of {reportsTotalPages} · {reportsTotal} report{reportsTotal === 1 ? "" : "s"}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= reportsTotalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(reportsTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportViewer reportId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}

async function loadFullReport(reportId: string): Promise<PathologyPdfData | null> {
  // Wave 1: everything that only needs reportId runs in parallel
  const [reportRes, ttsRes, resultsRes] = await Promise.all([
    supabase.from("lab_pathology_reports").select("*").eq("id", reportId).single(),
    supabase.from("lab_pathology_report_test_types").select("test_type_id, sort_order, lab_test_types(*)").eq("report_id", reportId).order("sort_order"),
    supabase.from("lab_pathology_report_results").select("*").eq("report_id", reportId),
  ]);
  const r = reportRes.data;
  if (reportRes.error || !r) { toast.error("Report not found"); return null; }
  const tts = ttsRes.data ?? [];
  const results = resultsRes.data ?? [];
  const testTypeIds = tts.map((t: any) => t.test_type_id);

  // Wave 2: params (needs testTypeIds) and phone (needs patient_id) in parallel
  const [paramsRes, phoneRes] = await Promise.all([
    testTypeIds.length > 0
      ? supabase.from("lab_test_parameters").select("*").in("test_type_id", testTypeIds).order("sort_order")
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("profiles").select("phone").eq("id", r.patient_id).single(),
  ]);
  const params = paramsRes.data ?? [];
  const phone = phoneRes.data?.phone ?? null;

  // Wave 3: subranges (needs paramIds)
  const paramIds = params.map((p: any) => p.id);
  const { data: subrangesAll } = paramIds.length > 0
    ? await supabase.from("lab_parameter_subranges").select("*").in("parameter_id", paramIds).order("sort_order")
    : { data: [] as any[] };

  return {
    reportNumber: r.report_number,
    patientName: r.patient_name_snapshot ?? "",
    patientId: "—",
    patientDbId: r.patient_id,
    currentReportId: r.id,
    patientAge: r.patient_age_snapshot,
    patientSex: r.patient_sex_snapshot,
    phone,
    referredBy: r.referred_by,
    collectionAddress: r.collection_address,
    sampleType: r.sample_type,
    instrument: r.instrument,
    registeredAt: r.registered_at,
    collectedAt: r.collected_at,
    reportedAt: r.reported_at,
    interpretation: r.interpretation,
    status: r.status as any,
    testTypes: (tts ?? []).map((tt: any) => ({
      name: tt.lab_test_types?.name ?? "",
      report_category: tt.lab_test_types?.report_category ?? null,
      method: tt.lab_test_types?.method ?? null,
      notes: tt.lab_test_types?.notes ?? null,
      parameters: (params ?? []).filter((p: any) => p.test_type_id === tt.test_type_id).map((p: any) => {
        const res = (results ?? []).find((rr: any) => rr.parameter_id === p.id);
        const psubs = (subrangesAll ?? []).filter((s: any) => s.parameter_id === p.id);
        return {
          category_heading: p.category_heading,
          parameter_name: p.parameter_name,
          unit: p.unit,
          ref_display: p.ref_display,
          ref_min: p.ref_min,
          ref_max: p.ref_max,
          result_value: res?.result_value ?? null,
          flag: (res?.flag ?? null) as "Low" | "High" | "Borderline" | null,
          subrange_used: res?.subrange_used ?? null,
          subrange_id: res?.subrange_id ?? null,
          display_all_subranges: psubs.length > 0 || !!p.display_all_subranges,
          subranges: psubs.map((s: any) => ({
            id: s.id,
            label: s.label,
            ref_min: s.ref_min,
            ref_max: s.ref_max,
            ref_display: s.ref_display,
          })),
          parameter_id: p.id,
        };
      }),
    })),
  };
}

async function reprintReport(reportId: string) {
  const data = await loadFullReport(reportId);
  if (data) await generatePathologyReportPDF(data);
}

function ReportViewer({ reportId, onClose }: { reportId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["pathology_report_view", reportId],
    enabled: !!reportId,
    queryFn: () => loadFullReport(reportId!),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  // Default = all tests that have at least one filled result
  useEffect(() => {
    if (!data) return;
    const def = new Set<string>();
    data.testTypes.forEach((tt) => {
      const hasResult = tt.parameters.some((p) => p.result_value !== null && p.result_value !== "");
      if (hasResult) def.add(tt.name);
    });
    setSelected(def);
  }, [data]);

  const toggle = (name: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const printSelected = async () => {
    if (!data || printing) return;
    if (selected.size === 0) { toast.error("Select at least one test"); return; }
    const filtered: PathologyPdfData = { ...data, testTypes: data.testTypes.filter((t) => selected.has(t.name)) };
    setPrinting(true);
    try { await generatePathologyReportPDF(filtered); }
    finally { setPrinting(false); }
  };

  const printCombined = async () => {
    if (!data || printing) return;
    // Combined = only tests that have results
    const ready = data.testTypes.filter((t) => t.parameters.some((p) => p.result_value !== null && p.result_value !== ""));
    if (ready.length === 0) { toast.error("No completed tests to print"); return; }
    setPrinting(true);
    try { await generatePathologyReportPDF({ ...data, testTypes: ready }); }
    finally { setPrinting(false); }
  };

  return (
    <Dialog open={!!reportId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader><DialogTitle>Report {data?.reportNumber}</DialogTitle></DialogHeader>
        {isLoading && <div className="text-center py-8">Loading…</div>}
        {data && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><b>Patient:</b> {data.patientName}</div>
              <div><b>Age/Sex:</b> {data.patientAge ?? "—"} / {data.patientSex ?? "—"}</div>
              <div><b>Referred By:</b> {data.referredBy ?? "—"}</div>
              <div><b>Sample:</b> {data.sampleType ?? "—"}</div>
              <div><b>Status:</b> {data.status}</div>
              <div><b>Reported:</b> {data.reportedAt ? format(new Date(data.reportedAt), "dd MMM yyyy HH:mm") : "—"}</div>
            </div>
            <div className="rounded-lg border bg-blue-50/40 p-3 text-xs">
              <b>Tip:</b> Tick the tests below to print just those, or use <b>Combined PDF</b> to print all completed tests at once.
            </div>
            {data.testTypes.map((tt, i) => {
              const hasResult = tt.parameters.some((p) => p.result_value !== null && p.result_value !== "");
              return (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-blue-700">
                      {tt.name}{tt.report_category ? ` — ${tt.report_category}` : ""}
                      {!hasResult && <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">Pending</Badge>}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={selected.has(tt.name)} onChange={() => toggle(tt.name)} disabled={!hasResult} />
                      Include in PDF
                    </label>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left py-1">Parameter</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead>
                    <tbody>
                      {(() => {
                        // Match the PDF: show a category heading once when it changes, and
                        // ALWAYS show the parameter's data row underneath (a parameter can
                        // have both a heading and its own result/unit/reference).
                        let lastHeading: string | null = null;
                        return tt.parameters.flatMap((p, j) => {
                          const out = [];
                          if (p.category_heading && p.category_heading !== lastHeading) {
                            lastHeading = p.category_heading;
                            out.push(
                              <tr key={`${j}-h`}><td colSpan={5} className="font-semibold pt-2 text-amber-800">{p.category_heading}</td></tr>
                            );
                          }
                          out.push(
                            <tr key={j} className="border-b last:border-b-0">
                              <td className="py-1">{p.parameter_name}</td>
                              <td className="text-center font-medium">{p.result_value ?? "—"}</td>
                              <td className="text-center">{p.unit ?? "—"}</td>
                              <td className="text-xs">{p.ref_display ?? "—"}{p.subrange_used ? ` (${p.subrange_used})` : ""}</td>
                              <td className="text-center">{p.flag ?? ""}</td>
                            </tr>
                          );
                          return out;
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {data.interpretation && <div><b>Interpretation:</b> <div className="whitespace-pre-wrap text-muted-foreground">{data.interpretation}</div></div>}
            <div className="flex justify-end gap-2 pt-2 border-t flex-wrap">
              <Button variant="outline" onClick={onClose} disabled={printing}>Close</Button>
              <Button variant="outline" onClick={printSelected} disabled={printing}>
                {printing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
                {printing ? "Generating…" : `Print Selected (${selected.size})`}
              </Button>
              <Button onClick={printCombined} disabled={printing}>
                {printing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
                {printing ? "Generating…" : "Combined PDF (all completed)"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
