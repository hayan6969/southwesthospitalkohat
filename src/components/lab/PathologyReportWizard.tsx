import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, FileText, Printer, Save, X, History, FlaskConical, Receipt, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getFlag, flagBadgeClass, type PathologyFlag } from "@/utils/pathologyFlag";
import { generatePathologyReportPDF, type PathologyPdfData } from "@/utils/pathologyPdfGenerator";

interface TestType {
  id: string;
  name: string;
  report_category: string | null;
  method: string | null;
  notes: string | null;
}
interface Parameter {
  id: string;
  test_type_id: string;
  category_heading: string | null;
  parameter_name: string;
  unit: string | null;
  ref_display: string | null;
  ref_min: number | null;
  ref_max: number | null;
  has_subranges: boolean;
  is_optional: boolean;
  sort_order: number;
}
interface Subrange {
  id: string;
  parameter_id: string;
  label: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_display: string | null;
}

interface ResultRow {
  parameter_id: string;
  result_value: string;
  flag: PathologyFlag;
  subrange_id: string | null; // selected subrange id
  skipped: boolean;
}

const initialMeta = () => ({
  report_number: "",
  sample_type: "Serum",
  collection_address: "",
  instrument: "",
  registered_at: new Date().toISOString().slice(0, 16),
  collected_at: new Date().toISOString().slice(0, 16),
  reported_at: new Date().toISOString().slice(0, 16),
  referred_by: "",
  age: "",
  sex: "",
});

export function PathologyReportWizard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [meta, setMeta] = useState(initialMeta());
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ResultRow>>({});
  const [interpretation, setInterpretation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate next sequential report number (LAB-XXXXX)
  useEffect(() => {
    if (meta.report_number) return;
    (async () => {
      const { data } = await supabase
        .from("lab_pathology_reports")
        .select("report_number")
        .ilike("report_number", "LAB-%")
        .order("created_at", { ascending: false })
        .limit(1);
      let next = 1;
      const last = data?.[0]?.report_number as string | undefined;
      if (last) {
        const m = last.match(/LAB-(\d+)/i);
        if (m) next = parseInt(m[1], 10) + 1;
      }
      const formatted = `LAB-${String(next).padStart(5, "0")}`;
      setMeta((m) => (m.report_number ? m : { ...m, report_number: formatted }));
    })();
  }, [meta.report_number]);

  // ===== Paid orders ready for lab =====
  const { data: readyOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["pathology_orders_ready"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_orders")
        .select("*, lab_pathology_order_items(*)")
        .eq("payment_status", "paid")
        .in("lab_status", ["ready", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const pickOrder = async (orderId: string) => {
    const order = readyOrders?.find((o) => o.id === orderId);
    if (!order) return;
    setSelectedOrderId(orderId);
    // Fetch patient + profile separately
    const { data: pat } = await supabase
      .from("patients")
      .select("*")
      .eq("id", order.patient_id)
      .maybeSingle();
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", order.patient_id)
      .maybeSingle();
    if (pat) setSelectedPatient({ ...pat, profile: prof });
    setSelectedTestIds((order.lab_pathology_order_items ?? []).map((i: any) => i.test_type_id));
    setMeta((m) => ({
      ...m,
      referred_by: order.referred_by ?? "",
      sample_type: order.sample_type ?? m.sample_type,
    }));
  };

  // ===== Queries =====
  const { data: searchedPatients } = useSearchPatientsWithNames(searchTerm);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as TestType[];
    },
  });

  const { data: parameters } = useQuery({
    queryKey: ["lab_test_parameters", selectedTestIds],
    enabled: selectedTestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_parameters")
        .select("*")
        .in("test_type_id", selectedTestIds)
        .order("sort_order");
      if (error) throw error;
      return data as Parameter[];
    },
  });

  const paramIds = useMemo(() => parameters?.map((p) => p.id) ?? [], [parameters]);
  const { data: subranges } = useQuery({
    queryKey: ["lab_parameter_subranges", paramIds],
    enabled: paramIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_parameter_subranges")
        .select("*")
        .in("parameter_id", paramIds)
        .order("sort_order");
      if (error) throw error;
      return data as Subrange[];
    },
  });

  // ===== Last 2 reports for selected patient =====
  const { data: lastReports } = useQuery({
    queryKey: ["pathology_last_reports", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_reports")
        .select("id, report_number, reported_at, status, created_at")
        .eq("patient_id", selectedPatient.id)
        .order("created_at", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  const lastReportIds = useMemo(() => lastReports?.map((r) => r.id) ?? [], [lastReports]);
  const { data: lastReportResults } = useQuery({
    queryKey: ["pathology_last_results", lastReportIds],
    enabled: lastReportIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_report_results")
        .select("report_id, parameter_id, result_value, flag, lab_test_parameters(parameter_name, unit, ref_display)")
        .in("report_id", lastReportIds);
      if (error) throw error;
      return data as any[];
    },
  });

  // ===== Initialize result rows when params load =====
  useEffect(() => {
    if (!parameters) return;
    setResults((prev) => {
      const next = { ...prev };
      for (const p of parameters) {
        if (!next[p.id]) {
          next[p.id] = {
            parameter_id: p.id,
            result_value: "",
            flag: null,
            subrange_id: null,
            skipped: false,
          };
        }
      }
      // Drop entries no longer in selection
      for (const k of Object.keys(next)) {
        if (!parameters.find((p) => p.id === k)) delete next[k];
      }
      return next;
    });
  }, [parameters]);

  // ===== Helpers =====
  const getActiveRange = (p: Parameter, row: ResultRow) => {
    if (p.has_subranges && row.subrange_id) {
      const sr = subranges?.find((s) => s.id === row.subrange_id);
      if (sr) return { min: sr.ref_min, max: sr.ref_max, display: sr.ref_display, label: sr.label };
    }
    return { min: p.ref_min, max: p.ref_max, display: p.ref_display, label: null as string | null };
  };

  const updateResult = (paramId: string, patch: Partial<ResultRow>) => {
    setResults((prev) => {
      const cur = prev[paramId] ?? {
        parameter_id: paramId,
        result_value: "",
        flag: null,
        subrange_id: null,
        skipped: false,
      };
      const merged: ResultRow = { ...cur, ...patch };
      const p = parameters?.find((pp) => pp.id === paramId);
      if (p) {
        const r = getActiveRange(p, merged);
        merged.flag = merged.skipped ? null : getFlag(merged.result_value, r.min, r.max ?? null);
      }
      return { ...prev, [paramId]: merged };
    });
  };

  // ===== Step navigation guards =====
  const canNextFromStep1 = !!selectedPatient && !!meta.sex;
  const canNextFromStep2 = selectedTestIds.length > 0 && !!meta.report_number.trim();
  const canSave = (() => {
    if (!parameters) return false;
    return parameters.every((p) => {
      const r = results[p.id];
      if (!r) return false;
      if (r.skipped && p.is_optional) return true;
      if (p.has_subranges && !r.subrange_id) return false;
      return r.result_value.trim() !== "";
    });
  })();

  // ===== Save mutation =====
  const saveReport = async (status: "draft" | "final") => {
    if (submitting) return;
    if (!selectedPatient) return toast.error("Select a patient");
    if (selectedTestIds.length === 0) return toast.error("Select at least one test");
    if (!meta.report_number.trim()) return toast.error("Report number required");
    if (status === "final" && !canSave) return toast.error("Fill all required values before finalizing");

    setSubmitting(true);
    try {
      const { data: report, error: rErr } = await supabase
        .from("lab_pathology_reports")
        .insert({
          patient_id: selectedPatient.id,
          report_number: meta.report_number.trim(),
          patient_name_snapshot: `${selectedPatient.profile?.first_name ?? ""} ${selectedPatient.profile?.last_name ?? ""}`.trim(),
          patient_age_snapshot: meta.age ? Number(meta.age) : null,
          patient_sex_snapshot: meta.sex || null,
          referred_by: meta.referred_by || null,
          collection_address: meta.collection_address || null,
          sample_type: meta.sample_type || null,
          instrument: meta.instrument || null,
          interpretation: interpretation || null,
          registered_at: meta.registered_at ? new Date(meta.registered_at).toISOString() : null,
          collected_at: meta.collected_at ? new Date(meta.collected_at).toISOString() : null,
          reported_at: meta.reported_at ? new Date(meta.reported_at).toISOString() : null,
          status,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (rErr) throw rErr;

      // Test type rows
      const ttRows = selectedTestIds.map((id, idx) => ({
        report_id: report.id,
        test_type_id: id,
        sort_order: idx,
      }));
      const { error: ttErr } = await supabase.from("lab_pathology_report_test_types").insert(ttRows);
      if (ttErr) throw ttErr;

      // Result rows
      const resultRows = (parameters ?? [])
        .map((p) => results[p.id])
        .filter((r) => r && (r.result_value.trim() !== "" || r.skipped))
        .map((r) => {
          const p = parameters!.find((pp) => pp.id === r.parameter_id)!;
          const sr = r.subrange_id ? subranges?.find((s) => s.id === r.subrange_id) : null;
          return {
            report_id: report.id,
            parameter_id: r.parameter_id,
            result_value: r.skipped ? null : r.result_value,
            flag: r.flag,
            subrange_used: sr?.label ?? null,
            subrange_id: sr?.id ?? null,
          };
        });
      if (resultRows.length > 0) {
        const { error: resErr } = await supabase
          .from("lab_pathology_report_results")
          .insert(resultRows);
        if (resErr) throw resErr;
      }

      toast.success(`Report ${status === "final" ? "finalized" : "saved as draft"}`);
      queryClient.invalidateQueries({ queryKey: ["pathology_reports"] });

      // Link to source order
      if (selectedOrderId) {
        await supabase
          .from("lab_pathology_orders")
          .update({
            report_id: report.id,
            lab_status: status === "final" ? "reported" : "in_progress",
          })
          .eq("id", selectedOrderId);
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_ready"] });
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      }

      if (status === "final") {
        await downloadPdf(report.id);
        resetWizard();
      } else {
        setStep(4);
      }
    } catch (e: any) {
      console.error(e);
      const msg = e?.message?.includes("duplicate key")
        ? "Report number already exists. Use a unique number."
        : e?.message || "Failed to save report";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const buildPdfData = (): PathologyPdfData => {
    const tts = (testTypes ?? []).filter((t) => selectedTestIds.includes(t.id));
    return {
      reportNumber: meta.report_number,
      patientName: `${selectedPatient?.profile?.first_name ?? ""} ${selectedPatient?.profile?.last_name ?? ""}`.trim(),
      patientId: selectedPatient?.patient_number ?? "—",
      patientAge: meta.age || null,
      patientSex: meta.sex || null,
      phone: selectedPatient?.profile?.phone ?? null,
      referredBy: meta.referred_by || null,
      collectionAddress: meta.collection_address || null,
      sampleType: meta.sample_type || null,
      instrument: meta.instrument || null,
      registeredAt: meta.registered_at ? new Date(meta.registered_at).toISOString() : null,
      collectedAt: meta.collected_at ? new Date(meta.collected_at).toISOString() : null,
      reportedAt: meta.reported_at ? new Date(meta.reported_at).toISOString() : null,
      interpretation: interpretation || null,
      status: "final",
      testTypes: tts.map((tt) => ({
        name: tt.name,
        report_category: tt.report_category,
        method: tt.method,
        notes: tt.notes,
        parameters: (parameters ?? [])
          .filter((p) => p.test_type_id === tt.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => {
            const r = results[p.id];
            const range = r ? getActiveRange(p, r) : { min: p.ref_min, max: p.ref_max, display: p.ref_display, label: null };
            return {
              category_heading: p.category_heading,
              parameter_name: p.parameter_name,
              unit: p.unit,
              ref_display: range.display ?? p.ref_display,
              result_value: r?.skipped ? "Skipped" : r?.result_value ?? null,
              flag: r?.flag ?? null,
              subrange_used: range.label,
            };
          }),
      })),
    };
  };

  const downloadPdf = async (_reportId?: string) => {
    await generatePathologyReportPDF(buildPdfData());
  };

  const resetWizard = () => {
    setStep(1);
    setSearchTerm("");
    setSelectedPatient(null);
    setSelectedOrderId(null);
    setMeta(initialMeta());
    setSelectedTestIds([]);
    setResults({});
    setInterpretation("");
    refetchOrders();
  };

  // ===== Render =====
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            New Lab Report
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`px-3 py-1 rounded-full border text-xs ${
                  step === n ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground"
                }`}
              >
                Step {n}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ===== STEP 1: Patient ===== */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50/40">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" /> Enter Patient ID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Patient ID *</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="P-XXXXX"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the patient ID issued at billing. Only paid pathology orders for this patient will be shown.
                  </p>
                </div>

                {searchTerm.trim().length >= 2 && (
                  <>
                    {searchedPatients && searchedPatients.length > 0 ? (
                      <div className="space-y-2">
                        {searchedPatients.slice(0, 5).map((p: any) => {
                          const patientOrders = (readyOrders ?? []).filter(
                            (o: any) => o.patient_id === p.id
                          );
                          return (
                            <div key={p.id} className="border rounded-lg bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {p.profile?.first_name} {p.profile?.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {p.patient_number || "—"} · Phone: {p.profile?.phone || "—"}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[10px]">
                                  {patientOrders.length} paid order{patientOrders.length === 1 ? "" : "s"}
                                </Badge>
                              </div>
                              {patientOrders.length === 0 ? (
                                <div className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                                  No paid pathology orders for this patient. Ask the counter to bill the tests first.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                  {patientOrders.map((o: any) => {
                                    const isSelected = selectedOrderId === o.id;
                                    const tests = (o.lab_pathology_order_items ?? [])
                                      .map((i: any) => i.test_name_snapshot)
                                      .join(", ");
                                    return (
                                      <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => pickOrder(o.id)}
                                        className={`text-left p-3 border rounded-lg transition ${
                                          isSelected
                                            ? "border-blue-600 bg-blue-100"
                                            : "bg-white hover:border-blue-400"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                                          <Badge variant="outline" className="text-[10px]">
                                            {o.lab_status}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tests}</div>
                                        <div className="text-xs mt-1">
                                          {format(new Date(o.created_at), "dd-MMM-yy hh:mm a")}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">
                        No patient found for "{searchTerm}".
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {selectedPatient && (
              <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">
                    {selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: {selectedPatient.patient_number || "—"} · Phone: {selectedPatient.profile?.phone || "—"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSelectedOrderId(null);
                    setSelectedTestIds([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {selectedPatient && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={meta.age}
                    onChange={(e) => setMeta((m) => ({ ...m, age: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Sex *</Label>
                  <Select value={meta.sex} onValueChange={(v) => setMeta((m) => ({ ...m, sex: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referred By</Label>
                  <Input
                    value={meta.referred_by}
                    onChange={(e) => setMeta((m) => ({ ...m, referred_by: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Collection Address</Label>
                  <Input
                    value={meta.collection_address}
                    onChange={(e) => setMeta((m) => ({ ...m, collection_address: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Last 2 reports comparison */}
            {selectedPatient && lastReports && lastReports.length > 0 && (
              <Card className="border-blue-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" /> Last {lastReports.length} Report{lastReports.length > 1 ? "s" : ""} (Comparison)
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Reference</TableHead>
                        {lastReports.map((r) => (
                          <TableHead key={r.id}>
                            {r.report_number}
                            <div className="text-xs text-muted-foreground">
                              {r.reported_at ? format(new Date(r.reported_at), "dd-MMM-yy") : "—"}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(
                        new Map(
                          (lastReportResults ?? []).map((r: any) => [r.parameter_id, r])
                        ).values()
                      ).map((r: any) => (
                        <TableRow key={r.parameter_id}>
                          <TableCell>{r.lab_test_parameters?.parameter_name}</TableCell>
                          <TableCell>{r.lab_test_parameters?.unit}</TableCell>
                          <TableCell>{r.lab_test_parameters?.ref_display}</TableCell>
                          {lastReports.map((rep) => {
                            const match = (lastReportResults ?? []).find(
                              (x: any) => x.report_id === rep.id && x.parameter_id === r.parameter_id
                            );
                            return (
                              <TableCell key={rep.id}>
                                {match ? (
                                  <span className={match.flag ? `font-semibold` : ""}>
                                    {match.result_value ?? "—"}
                                    {match.flag && (
                                      <Badge variant="outline" className={`ml-2 ${flagBadgeClass(match.flag)}`}>
                                        {match.flag}
                                      </Badge>
                                    )}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== STEP 2: Tests + Report meta ===== */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Tests from Billed Order</Label>
              <p className="text-xs text-muted-foreground mb-2">
                These tests were billed by the counter for this patient. They cannot be changed here — to add or remove tests, raise a new order at billing.
              </p>
              {selectedTestIds.length === 0 ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                  No tests linked to this order. Go back and pick a paid order.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedTestIds.map((id) => {
                    const t = testTypes?.find((x) => x.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-start gap-2 p-3 border-2 border-blue-500 bg-blue-50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">{t?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{t?.report_category}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Report Number (auto)</Label>
                <Input
                  value={meta.report_number}
                  readOnly
                  className="bg-muted font-mono"
                  placeholder="Auto-generated"
                />
              </div>
              <div>
                <Label>Sample Type</Label>
                <Input
                  value={meta.sample_type}
                  onChange={(e) => setMeta((m) => ({ ...m, sample_type: e.target.value }))}
                />
              </div>
              <div>
                <Label>Instrument</Label>
                <Input
                  value={meta.instrument}
                  onChange={(e) => setMeta((m) => ({ ...m, instrument: e.target.value }))}
                />
              </div>
              <div>
                <Label>Registered At</Label>
                <Input
                  type="datetime-local"
                  value={meta.registered_at}
                  onChange={(e) => setMeta((m) => ({ ...m, registered_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Collected At</Label>
                <Input
                  type="datetime-local"
                  value={meta.collected_at}
                  onChange={(e) => setMeta((m) => ({ ...m, collected_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Reported At</Label>
                <Input
                  type="datetime-local"
                  value={meta.reported_at}
                  onChange={(e) => setMeta((m) => ({ ...m, reported_at: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Results ===== */}
        {step === 3 && (
          <div className="space-y-6">
            {testTypes
              ?.filter((t) => selectedTestIds.includes(t.id))
              .map((t) => {
                const params = (parameters ?? [])
                  .filter((p) => p.test_type_id === t.id)
                  .sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <div key={t.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 font-semibold text-sm">
                      {t.name}{" "}
                      <span className="text-xs text-muted-foreground">({t.report_category})</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parameter</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="w-[180px]">Result</TableHead>
                          <TableHead>Flag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {params.map((p) => {
                          const row = results[p.id];
                          if (!row) return null;
                          const subs = subranges?.filter((s) => s.parameter_id === p.id) ?? [];
                          const range = getActiveRange(p, row);
                          return (
                            <>
                              {p.category_heading && (
                                <TableRow key={`${p.id}-h`} className="bg-muted/40">
                                  <TableCell colSpan={5} className="font-bold text-xs">
                                    {p.category_heading}
                                  </TableCell>
                                </TableRow>
                              )}
                              <TableRow key={p.id}>
                                <TableCell>
                                  <div className="font-medium">{p.parameter_name}</div>
                                  {p.has_subranges && (
                                    <Select
                                      value={row.subrange_id ?? ""}
                                      onValueChange={(v) => updateResult(p.id, { subrange_id: v })}
                                    >
                                      <SelectTrigger className="h-7 mt-1 text-xs">
                                        <SelectValue placeholder="Select sub-range" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[10000]">
                                        {subs.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.label} ({s.ref_display})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {p.is_optional && (
                                    <label className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                      <Checkbox
                                        checked={row.skipped}
                                        onCheckedChange={(v) => updateResult(p.id, { skipped: !!v })}
                                      />
                                      Skip
                                    </label>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">{range.display ?? "—"}</TableCell>
                                <TableCell className="text-xs">{p.unit ?? "—"}</TableCell>
                                <TableCell>
                                  <Input
                                    value={row.result_value}
                                    disabled={row.skipped}
                                    onChange={(e) => updateResult(p.id, { result_value: e.target.value })}
                                    placeholder="e.g. 5.2 or <0.1"
                                  />
                                </TableCell>
                                <TableCell>
                                  {row.flag && (
                                    <Badge variant="outline" className={flagBadgeClass(row.flag)}>
                                      {row.flag}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

            <div>
              <Label>Interpretation / Notes</Label>
              <Textarea
                rows={4}
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Clinical interpretation, advice, etc."
              />
            </div>
          </div>
        )}

        {/* ===== STEP 4: Done ===== */}
        {step === 4 && (
          <div className="text-center py-10 space-y-4">
            <FileText className="w-14 h-14 mx-auto text-blue-600" />
            <h3 className="text-xl font-semibold">Report Saved</h3>
            <p className="text-sm text-muted-foreground">
              You can print the report PDF or start a new report.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => downloadPdf()}>
                <Printer className="w-4 h-4 mr-2" /> Download PDF
              </Button>
              <Button variant="outline" onClick={resetWizard}>
                Start New Report
              </Button>
            </div>
          </div>
        )}

        {/* ===== Footer nav ===== */}
        {step < 4 && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              {step === 3 && (
                <>
                  <Button variant="outline" disabled={submitting} onClick={() => saveReport("draft")}>
                    <Save className="w-4 h-4 mr-1" /> Save Draft
                  </Button>
                  <Button disabled={submitting || !canSave} onClick={() => saveReport("final")}>
                    <FileText className="w-4 h-4 mr-1" /> Generate Final Report
                  </Button>
                </>
              )}
              {step < 3 && (
                <Button
                  disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !canNextFromStep2)}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
