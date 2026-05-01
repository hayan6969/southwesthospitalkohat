import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Search, Printer, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { generatePathologyReportPDF, type PathologyPdfData } from "@/utils/pathologyPdfGenerator";
import { toast } from "sonner";

export function PathologyReportHistory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [testTypeFilter, setTestTypeFilter] = useState<string>("all");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types_filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_types").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["pathology_reports", search, status, from, to, testTypeFilter],
    queryFn: async () => {
      let q = supabase
        .from("lab_pathology_reports")
        .select("id, report_number, patient_id, patient_name_snapshot, patient_age_snapshot, patient_sex_snapshot, referred_by, status, reported_at, created_at, lab_pathology_report_test_types(test_type_id, lab_test_types(name))")
        .order("created_at", { ascending: false })
        .limit(200);

      if (status !== "all") q = q.eq("status", status);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) {
        const end = new Date(to); end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;

      let filtered = data as any[];
      if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.report_number || "").toLowerCase().includes(s) ||
          (r.patient_name_snapshot || "").toLowerCase().includes(s)
        );
      }
      if (testTypeFilter !== "all") {
        filtered = filtered.filter((r) =>
          (r.lab_pathology_report_test_types || []).some((tt: any) => tt.test_type_id === testTypeFilter)
        );
      }
      return filtered;
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-blue-600" /> Pathology Report History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Label>Search (Report # or Patient)</Label>
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
                    <TableCell className="text-xs max-w-[220px] truncate" title={(r.lab_pathology_report_test_types || []).map((t: any) => t.lab_test_types?.name).join(", ")}>
                      {(r.lab_pathology_report_test_types || []).map((t: any) => t.lab_test_types?.name).filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.referred_by || "—"}</TableCell>
                    <TableCell className="text-xs">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "final" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewingId(r.id)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => reprintReport(r.id)}><Printer className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ReportViewer reportId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}

async function loadFullReport(reportId: string): Promise<PathologyPdfData | null> {
  const { data: r, error: e1 } = await supabase.from("lab_pathology_reports").select("*").eq("id", reportId).single();
  if (e1 || !r) { toast.error("Report not found"); return null; }
  const { data: tts } = await supabase.from("lab_pathology_report_test_types").select("test_type_id, sort_order, lab_test_types(*)").eq("report_id", reportId).order("sort_order");
  const testTypeIds = (tts ?? []).map((t: any) => t.test_type_id);
  const { data: params } = await supabase.from("lab_test_parameters").select("*").in("test_type_id", testTypeIds).order("sort_order");
  const { data: results } = await supabase.from("lab_pathology_report_results").select("*").eq("report_id", reportId);

  const phone = (await supabase.from("profiles").select("phone").eq("id", r.patient_id).single()).data?.phone ?? null;

  return {
    reportNumber: r.report_number,
    patientName: r.patient_name_snapshot ?? "",
    patientId: "—",
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
        return {
          category_heading: p.category_heading,
          parameter_name: p.parameter_name,
          unit: p.unit,
          ref_display: p.ref_display,
          result_value: res?.result_value ?? null,
          flag: res?.flag ?? null,
          subrange_used: res?.subrange_used ?? null,
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
            {data.testTypes.map((tt, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="font-bold text-blue-700 mb-1">{tt.name}{tt.report_category ? ` — ${tt.report_category}` : ""}</div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left py-1">Parameter</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead>
                  <tbody>
                    {tt.parameters.map((p, j) => (
                      p.category_heading ? (
                        <tr key={j}><td colSpan={5} className="font-semibold pt-2 text-amber-800">{p.category_heading}</td></tr>
                      ) : (
                        <tr key={j} className="border-b last:border-b-0">
                          <td className="py-1">{p.parameter_name}</td>
                          <td className="text-center font-medium">{p.result_value ?? "—"}</td>
                          <td className="text-center">{p.unit ?? "—"}</td>
                          <td className="text-xs">{p.ref_display ?? "—"}{p.subrange_used ? ` (${p.subrange_used})` : ""}</td>
                          <td className="text-center">{p.flag ?? ""}</td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {data.interpretation && <div><b>Interpretation:</b> <div className="whitespace-pre-wrap text-muted-foreground">{data.interpretation}</div></div>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => generatePathologyReportPDF(data)}><Printer className="w-4 h-4 mr-1" /> Reprint PDF</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
