import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, ChevronLeft, ChevronRight, FileText, Printer, Save, X, History, FlaskConical, Receipt, CheckCircle, Clock } from "lucide-react";
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
  display_all_subranges?: boolean;
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
  is_result_row?: boolean;
}

interface ResultRow {
  parameter_id: string;
  result_value: string;
  flag: PathologyFlag;
  subrange_id: string | null;
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
  const [existingReportId, setExistingReportId] = useState<string | null>(null);
  const [meta, setMeta] = useState(initialMeta());
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  // Tests user marks as "results not ready yet" — excluded from this save.
  const [pendingTestIds, setPendingTestIds] = useState<Set<string>>(new Set());
  // Tests already saved with results in a prior partial save (read-only here).
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set());
  // Which completed tests to include in the immediate PDF (default: all completed).
  const [pdfIncludeTestIds, setPdfIncludeTestIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, ResultRow>>({});
  const [interpretation, setInterpretation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate next sequential report number (LAB-XXXXX) — skip when editing existing
  useEffect(() => {
    if (meta.report_number || existingReportId) return;
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
  }, [meta.report_number, existingReportId]);

  // Paid orders ready for lab
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

  // Partial reports for selected patient (so user can resume them)
  const { data: partialReports, refetch: refetchPartials } = useQuery({
    queryKey: ["pathology_partial_reports", selectedPatient?.id],
    enabled: !!selectedPatient?.id && !existingReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_reports")
        .select("id, report_number, status, created_at, lab_pathology_report_test_types(test_type_id, lab_test_types(name))")
        .eq("patient_id", selectedPatient.id)
        .eq("status", "partial")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  const pickOrder = async (orderId: string) => {
    const order = readyOrders?.find((o) => o.id === orderId);
    if (!order) return;
    setSelectedOrderId(orderId);

    const { data: pat } = await supabase.from("patients").select("*").eq("id", order.patient_id).maybeSingle();
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", order.patient_id).maybeSingle();
    if (pat) setSelectedPatient({ ...pat, profile: prof });

    // If a partial report already exists for this patient, resume it instead of starting fresh
    const { data: existingPartial } = await supabase
      .from("lab_pathology_reports")
      .select("id")
      .eq("patient_id", order.patient_id)
      .eq("status", "partial")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPartial?.id) {
      await resumePartial(existingPartial.id);
      return;
    }

    setExistingReportId(null);
    setSelectedTestIds((order.lab_pathology_order_items ?? []).map((i: any) => i.test_type_id));
    setPendingTestIds(new Set());
    setCompletedTestIds(new Set());
    setMeta((m) => ({
      ...m,
      referred_by: order.referred_by ?? "",
      sample_type: order.sample_type ?? m.sample_type,
    }));
  };

  // Resume an existing partial report — load its data and lock filled tests
  const resumePartial = async (reportId: string) => {
    setSubmitting(true);
    try {
      const { data: report, error: e1 } = await supabase
        .from("lab_pathology_reports").select("*").eq("id", reportId).single();
      if (e1) throw e1;
      const { data: tts } = await supabase
        .from("lab_pathology_report_test_types").select("test_type_id").eq("report_id", reportId);
      const { data: existingResults } = await supabase
        .from("lab_pathology_report_results").select("*").eq("report_id", reportId);

      const allTestIds: string[] = (tts ?? []).map((t: any) => t.test_type_id);
      // Determine which test types already have at least one result row → completed.
      const { data: paramRows } = await supabase
        .from("lab_test_parameters").select("id, test_type_id").in("test_type_id", allTestIds);
      const paramToTest = new Map<string, string>((paramRows ?? []).map((p: any) => [p.id, p.test_type_id]));
      const filledTests = new Set<string>();
      (existingResults ?? []).forEach((r: any) => {
        const tid = paramToTest.get(r.parameter_id);
        if (tid) filledTests.add(tid);
      });

      setExistingReportId(reportId);
      setSelectedTestIds(allTestIds);
      setCompletedTestIds(filledTests);
      // Tests not yet filled start as pending (user will fill what they can now)
      setPendingTestIds(new Set(allTestIds.filter((id) => !filledTests.has(id))));
      setMeta((m) => ({
        ...m,
        report_number: report.report_number,
        sample_type: report.sample_type ?? m.sample_type,
        instrument: report.instrument ?? "",
        referred_by: report.referred_by ?? "",
        collection_address: report.collection_address ?? "",
        registered_at: report.registered_at ? new Date(report.registered_at).toISOString().slice(0, 16) : m.registered_at,
        collected_at: report.collected_at ? new Date(report.collected_at).toISOString().slice(0, 16) : m.collected_at,
        reported_at: new Date().toISOString().slice(0, 16),
        age: report.patient_age_snapshot != null ? String(report.patient_age_snapshot) : "",
        sex: report.patient_sex_snapshot ?? "",
      }));
      setInterpretation(report.interpretation ?? "");
      // Pre-fill results rows for already-filled parameters (read-only display)
      const seeded: Record<string, ResultRow> = {};
      (existingResults ?? []).forEach((r: any) => {
        seeded[r.parameter_id] = {
          parameter_id: r.parameter_id,
          result_value: r.result_value ?? "",
          flag: (r.flag ?? null) as PathologyFlag,
          subrange_id: r.subrange_id ?? null,
          skipped: false,
        };
      });
      setResults(seeded);
      toast.success("Loaded partial report — fill the remaining tests");
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load partial report");
    } finally {
      setSubmitting(false);
    }
  };

  const { data: searchedPatients } = useSearchPatientsWithNames(searchTerm);

  const { data: testTypes } = useQuery({
    queryKey: ["lab_test_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_types").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as TestType[];
    },
  });

  const { data: parameters } = useQuery({
    queryKey: ["lab_test_parameters", selectedTestIds],
    enabled: selectedTestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_test_parameters").select("*").in("test_type_id", selectedTestIds).order("sort_order");
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
        .from("lab_parameter_subranges").select("*").in("parameter_id", paramIds).order("sort_order");
      if (error) throw error;
      return data as Subrange[];
    },
  });

  // Last 2 reports for selected patient (comparison view)
  const { data: lastReports } = useQuery({
    queryKey: ["pathology_last_reports", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_pathology_reports")
        .select("id, report_number, reported_at, status, created_at")
        .eq("patient_id", selectedPatient.id)
        .order("created_at", { ascending: false }).limit(2);
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

  // Initialize result rows when params load
  useEffect(() => {
    if (!parameters) return;
    setResults((prev) => {
      const next = { ...prev };
      for (const p of parameters) {
        if (!next[p.id]) {
          next[p.id] = { parameter_id: p.id, result_value: "", flag: null, subrange_id: null, skipped: false };
        }
      }
      for (const k of Object.keys(next)) {
        if (!parameters.find((p) => p.id === k)) delete next[k];
      }
      return next;
    });
  }, [parameters]);

  const getActiveRange = (p: Parameter, row: ResultRow) => {
    if (p.has_subranges && row.subrange_id) {
      const sr = subranges?.find((s) => s.id === row.subrange_id);
      if (sr) return { min: sr.ref_min, max: sr.ref_max, display: sr.ref_display, label: sr.label };
    }
    return { min: p.ref_min, max: p.ref_max, display: p.ref_display, label: null as string | null };
  };

  const updateResult = (paramId: string, patch: Partial<ResultRow>) => {
    setResults((prev) => {
      const cur = prev[paramId] ?? { parameter_id: paramId, result_value: "", flag: null, subrange_id: null, skipped: false };
      const merged: ResultRow = { ...cur, ...patch };
      const p = parameters?.find((pp) => pp.id === paramId);
      if (p) {
        const r = getActiveRange(p, merged);
        merged.flag = merged.skipped ? null : getFlag(merged.result_value, r.min, r.max ?? null);
      }
      return { ...prev, [paramId]: merged };
    });
  };

  const togglePending = (testId: string) => {
    if (completedTestIds.has(testId)) return; // can't mark already-saved tests as pending
    setPendingTestIds((s) => {
      const n = new Set(s);
      if (n.has(testId)) n.delete(testId);
      else n.add(testId);
      return n;
    });
  };

  // Tests user is filling now = selected − pending − completed
  const fillingTestIds = useMemo(
    () => selectedTestIds.filter((id) => !pendingTestIds.has(id) && !completedTestIds.has(id)),
    [selectedTestIds, pendingTestIds, completedTestIds]
  );

  const canNextFromStep1 = !!selectedPatient && !!meta.sex;
  const canNextFromStep2 = selectedTestIds.length > 0 && !!meta.report_number.trim();

  // canSave: only validate parameters of tests being filled now
  const canSave = (() => {
    if (!parameters) return false;
    if (fillingTestIds.length === 0 && pendingTestIds.size > 0) {
      // nothing to save, only pending — allow pure "save draft" state via Save Pending button
      return false;
    }
    const filling = parameters.filter((p) => fillingTestIds.includes(p.test_type_id));
    return filling.every((p) => {
      const r = results[p.id];
      if (!r) return false;
      if (r.skipped && p.is_optional) return true;
      if (p.has_subranges && !r.subrange_id) return false;
      return r.result_value.trim() !== "";
    });
  })();

  // Default PDF-include set = tests being filled now + already completed
  useEffect(() => {
    const all = [...fillingTestIds, ...Array.from(completedTestIds)];
    setPdfIncludeTestIds(new Set(all));
  }, [fillingTestIds.join(","), completedTestIds.size]); // eslint-disable-line

  const togglePdfInclude = (id: string) => {
    setPdfIncludeTestIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const saveReport = async (mode: "final" | "partial") => {
    if (submitting) return;
    if (!selectedPatient) return toast.error("Select a patient");
    if (selectedTestIds.length === 0) return toast.error("Select at least one test");
    if (!meta.report_number.trim()) return toast.error("Report number required");

    // For final, every selected test must be filled or already completed. No pending allowed.
    if (mode === "final" && pendingTestIds.size > 0) {
      return toast.error("Some tests are still marked Pending. Fill them or use 'Save Partial'.");
    }
    if (!canSave && fillingTestIds.length > 0) {
      return toast.error("Fill all values for the tests being saved");
    }

    setSubmitting(true);
    try {
      let reportId = existingReportId;

      if (!reportId) {
        // INSERT new report
        const status = pendingTestIds.size > 0 ? "partial" : (mode === "final" ? "final" : "partial");
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
          }).select().single();
        if (rErr) throw rErr;
        reportId = report.id;

        // Persist all selected test types (so we know about pending ones too)
        const ttRows = selectedTestIds.map((id, idx) => ({
          report_id: reportId, test_type_id: id, sort_order: idx,
        }));
        const { error: ttErr } = await supabase.from("lab_pathology_report_test_types").insert(ttRows);
        if (ttErr) throw ttErr;
      } else {
        // UPDATE existing partial report meta + status
        const newStatus = pendingTestIds.size > 0 ? "partial" : "final";
        const { error: upErr } = await supabase
          .from("lab_pathology_reports")
          .update({
            interpretation: interpretation || null,
            instrument: meta.instrument || null,
            sample_type: meta.sample_type || null,
            referred_by: meta.referred_by || null,
            collection_address: meta.collection_address || null,
            reported_at: meta.reported_at ? new Date(meta.reported_at).toISOString() : null,
            status: newStatus,
          }).eq("id", reportId);
        if (upErr) throw upErr;
      }

      // Insert result rows ONLY for tests being filled now
      const fillingParamIds = new Set(
        (parameters ?? []).filter((p) => fillingTestIds.includes(p.test_type_id)).map((p) => p.id)
      );
      const resultRows = (parameters ?? [])
        .filter((p) => fillingParamIds.has(p.id))
        .map((p) => results[p.id])
        .filter((r) => r && (r.result_value.trim() !== "" || r.skipped))
        .map((r) => {
          const sr = r.subrange_id ? subranges?.find((s) => s.id === r.subrange_id) : null;
          return {
            report_id: reportId!,
            parameter_id: r.parameter_id,
            result_value: r.skipped ? null : r.result_value,
            flag: r.flag,
            subrange_used: sr?.label ?? null,
            subrange_id: sr?.id ?? null,
          };
        });
      if (resultRows.length > 0) {
        const { error: resErr } = await supabase.from("lab_pathology_report_results").insert(resultRows);
        if (resErr) throw resErr;
      }

      const isFinal = pendingTestIds.size === 0;
      toast.success(isFinal ? "Report finalized" : "Partial save complete — pending tests can be added later");
      queryClient.invalidateQueries({ queryKey: ["pathology_reports"] });
      queryClient.invalidateQueries({ queryKey: ["pathology_partial_reports"] });

      if (selectedOrderId && !existingReportId) {
        await supabase.from("lab_pathology_orders").update({
          report_id: reportId,
          lab_status: isFinal ? "reported" : "in_progress",
        }).eq("id", selectedOrderId);
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_ready"] });
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      } else if (isFinal && reportId) {
        // Resumed partial report: mark any orders linked to this report as reported
        await supabase.from("lab_pathology_orders").update({
          lab_status: "reported",
        }).eq("report_id", reportId);
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_ready"] });
        queryClient.invalidateQueries({ queryKey: ["pathology_orders_recent"] });
      }

      // Generate PDF for selected tests (combined)
      if (pdfIncludeTestIds.size > 0) {
        await downloadPdfForReport(reportId!, Array.from(pdfIncludeTestIds));
      }

      if (isFinal) {
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

  // Build PDF data from DB for a specific report, optionally filtered to selected test types
  const downloadPdfForReport = async (reportId: string, includeTestTypeIds?: string[]) => {
    const { data: r } = await supabase.from("lab_pathology_reports").select("*").eq("id", reportId).single();
    if (!r) return;
    const { data: tts } = await supabase
      .from("lab_pathology_report_test_types")
      .select("test_type_id, sort_order, lab_test_types(*)")
      .eq("report_id", reportId).order("sort_order");
    const allTestTypeIds = (tts ?? []).map((t: any) => t.test_type_id);
    const filterIds = includeTestTypeIds && includeTestTypeIds.length > 0 ? includeTestTypeIds : allTestTypeIds;
    const ttsFiltered = (tts ?? []).filter((t: any) => filterIds.includes(t.test_type_id));
    const { data: params } = await supabase
      .from("lab_test_parameters").select("*").in("test_type_id", filterIds).order("sort_order");
    const { data: resultsDb } = await supabase
      .from("lab_pathology_report_results").select("*").eq("report_id", reportId);
    const phone = (await supabase.from("profiles").select("phone").eq("id", r.patient_id).single()).data?.phone ?? null;
    const { data: pat } = await supabase.from("patients").select("patient_number").eq("id", r.patient_id).maybeSingle();

    const data: PathologyPdfData = {
      reportNumber: r.report_number,
      patientName: r.patient_name_snapshot ?? "",
      patientId: pat?.patient_number ?? "—",
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
      status: (r.status === "final" ? "final" : "draft") as any,
      testTypes: ttsFiltered.map((tt: any) => ({
        name: tt.lab_test_types?.name ?? "",
        report_category: tt.lab_test_types?.report_category ?? null,
        method: tt.lab_test_types?.method ?? null,
        notes: tt.lab_test_types?.notes ?? null,
        parameters: (params ?? []).filter((p: any) => p.test_type_id === tt.test_type_id).map((p: any) => {
          const res = (resultsDb ?? []).find((rr: any) => rr.parameter_id === p.id);
          return {
            category_heading: p.category_heading,
            parameter_name: p.parameter_name,
            unit: p.unit,
            ref_display: p.ref_display,
            result_value: res?.result_value ?? null,
            flag: (res?.flag ?? null) as "Low" | "High" | "Borderline" | null,
            subrange_used: res?.subrange_used ?? null,
            parameter_id: p.id,
          };
        }),
      })),
    };
    await generatePathologyReportPDF(data);
  };

  const resetWizard = () => {
    setStep(1);
    setSearchTerm("");
    setSelectedPatient(null);
    setSelectedOrderId(null);
    setExistingReportId(null);
    setMeta(initialMeta());
    setSelectedTestIds([]);
    setPendingTestIds(new Set());
    setCompletedTestIds(new Set());
    setPdfIncludeTestIds(new Set());
    setResults({});
    setInterpretation("");
    refetchOrders();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            {existingReportId ? "Continue Lab Report" : "New Lab Report"}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`px-3 py-1 rounded-full border text-xs ${step === n ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground"}`}>
                Step {n}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* STEP 1: Patient */}
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
                    <Input className="pl-10" placeholder="P-XXXXX" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Enter the patient ID issued at billing. Only paid pathology orders for this patient will be shown.</p>
                </div>

                {searchTerm.trim().length >= 2 && (
                  <>
                    {searchedPatients && searchedPatients.length > 0 ? (
                      <div className="space-y-2">
                        {searchedPatients.slice(0, 5).map((p: any) => {
                          const patientOrders = (readyOrders ?? []).filter((o: any) => o.patient_id === p.id);
                          return (
                            <div key={p.id} className="border rounded-lg bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{p.profile?.first_name} {p.profile?.last_name}</div>
                                  <div className="text-xs text-muted-foreground">ID: {p.patient_number || "—"} · Phone: {p.profile?.phone || "—"}</div>
                                </div>
                                <Badge variant="outline" className="text-[10px]">{patientOrders.length} paid order{patientOrders.length === 1 ? "" : "s"}</Badge>
                              </div>
                              {patientOrders.length === 0 ? (
                                <div className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">No paid pathology orders for this patient. Ask the counter to bill the tests first.</div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                  {patientOrders.map((o: any) => {
                                    const isSelected = selectedOrderId === o.id;
                                    const tests = (o.lab_pathology_order_items ?? []).map((i: any) => i.test_name_snapshot).join(", ");
                                    return (
                                      <button key={o.id} type="button" onClick={() => pickOrder(o.id)} className={`text-left p-3 border rounded-lg transition ${isSelected ? "border-blue-600 bg-blue-100" : "bg-white hover:border-blue-400"}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                                          <Badge variant="outline" className="text-[10px]">{o.lab_status}</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tests}</div>
                                        <div className="text-xs mt-1">{format(new Date(o.created_at), "dd-MMM-yy hh:mm a")}</div>
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
                      <div className="text-sm text-muted-foreground py-2">No patient found for "{searchTerm}".</div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {selectedPatient && (
              <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">{selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}</div>
                  <div className="text-sm text-muted-foreground">ID: {selectedPatient.patient_number || "—"} · Phone: {selectedPatient.profile?.phone || "—"}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setSelectedOrderId(null); setSelectedTestIds([]); setExistingReportId(null); setCompletedTestIds(new Set()); setPendingTestIds(new Set()); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Resume partial reports for this patient */}
            {selectedPatient && partialReports && partialReports.length > 0 && !existingReportId && (
              <Card className="border-amber-300 bg-amber-50/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
                    <Clock className="w-4 h-4" /> Partial reports waiting for results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {partialReports.map((r: any) => {
                    const tests = (r.lab_pathology_report_test_types ?? []).map((t: any) => t.lab_test_types?.name).filter(Boolean).join(", ");
                    return (
                      <div key={r.id} className="flex items-center justify-between bg-white border rounded p-2">
                        <div>
                          <div className="font-mono text-sm font-semibold">{r.report_number}</div>
                          <div className="text-xs text-muted-foreground">{tests || "—"}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => resumePartial(r.id)}>
                          Continue
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {selectedPatient && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={meta.age} onChange={(e) => setMeta((m) => ({ ...m, age: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <Label>Sex *</Label>
                  <Select value={meta.sex} onValueChange={(v) => setMeta((m) => ({ ...m, sex: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referred By</Label>
                  <Input value={meta.referred_by} onChange={(e) => setMeta((m) => ({ ...m, referred_by: e.target.value }))} />
                </div>
                <div className="md:col-span-3">
                  <Label>Collection Address</Label>
                  <Input value={meta.collection_address} onChange={(e) => setMeta((m) => ({ ...m, collection_address: e.target.value }))} />
                </div>
              </div>
            )}

            {selectedPatient && lastReports && lastReports.length > 0 && (
              <Card className="border-blue-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Last {lastReports.length} Report{lastReports.length > 1 ? "s" : ""} (Comparison)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Reference</TableHead>
                        {lastReports.map((r) => (
                          <TableHead key={r.id}>{r.report_number}<div className="text-xs text-muted-foreground">{r.reported_at ? format(new Date(r.reported_at), "dd-MMM-yy") : "—"}</div></TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(new Map((lastReportResults ?? []).map((r: any) => [r.parameter_id, r])).values()).map((r: any) => (
                        <TableRow key={r.parameter_id}>
                          <TableCell>{r.lab_test_parameters?.parameter_name}</TableCell>
                          <TableCell>{r.lab_test_parameters?.unit}</TableCell>
                          <TableCell>{r.lab_test_parameters?.ref_display}</TableCell>
                          {lastReports.map((rep) => {
                            const match = (lastReportResults ?? []).find((x: any) => x.report_id === rep.id && x.parameter_id === r.parameter_id);
                            return (
                              <TableCell key={rep.id}>
                                {match ? (
                                  <span className={match.flag ? `font-semibold` : ""}>
                                    {match.result_value ?? "—"}
                                    {match.flag && <Badge variant="outline" className={`ml-2 ${flagBadgeClass(match.flag)}`}>{match.flag}</Badge>}
                                  </span>
                                ) : "—"}
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

        {/* STEP 2: Tests + Report meta */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Tests from Billed Order</Label>
              <p className="text-xs text-muted-foreground mb-2">These tests were billed by the counter for this patient. They cannot be changed here — to add or remove tests, raise a new order at billing.</p>
              {selectedTestIds.length === 0 ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">No tests linked to this order. Go back and pick a paid order.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedTestIds.map((id) => {
                    const t = testTypes?.find((x) => x.id === id);
                    const isCompleted = completedTestIds.has(id);
                    return (
                      <div key={id} className={`flex items-start gap-2 p-3 border-2 rounded-lg ${isCompleted ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50"}`}>
                        <CheckCircle className={`w-4 h-4 mt-0.5 ${isCompleted ? "text-green-600" : "text-blue-600"}`} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{t?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{t?.report_category}</div>
                          {isCompleted && <div className="text-xs text-green-700 font-medium mt-0.5">Already saved</div>}
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
                <Input value={meta.report_number} readOnly className="bg-muted font-mono" placeholder="Auto-generated" />
              </div>
              <div>
                <Label>Sample Type</Label>
                <Input value={meta.sample_type} onChange={(e) => setMeta((m) => ({ ...m, sample_type: e.target.value }))} />
              </div>
              <div>
                <Label>Instrument</Label>
                <Input value={meta.instrument} onChange={(e) => setMeta((m) => ({ ...m, instrument: e.target.value }))} />
              </div>
              <div><Label>Registered At</Label><Input type="datetime-local" value={meta.registered_at} onChange={(e) => setMeta((m) => ({ ...m, registered_at: e.target.value }))} /></div>
              <div><Label>Collected At</Label><Input type="datetime-local" value={meta.collected_at} onChange={(e) => setMeta((m) => ({ ...m, collected_at: e.target.value }))} /></div>
              <div><Label>Reported At</Label><Input type="datetime-local" value={meta.reported_at} onChange={(e) => setMeta((m) => ({ ...m, reported_at: e.target.value }))} /></div>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-blue-50/40 p-3 text-xs space-y-1">
              <div className="font-semibold text-blue-900">Some tests now, others later?</div>
              <div className="text-muted-foreground">
                Mark a test as <b>Pending</b> if its results aren't ready yet — you'll be able to come back later from the patient search to add them.
                Choose which completed tests to include in the printed PDF using the checkboxes.
              </div>
            </div>

            {testTypes
              ?.filter((t) => selectedTestIds.includes(t.id))
              .map((t) => {
                const isPending = pendingTestIds.has(t.id);
                const isCompleted = completedTestIds.has(t.id);
                const params = (parameters ?? []).filter((p) => p.test_type_id === t.id).sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <div key={t.id} className={`border rounded-lg overflow-hidden ${isPending ? "opacity-60" : ""}`}>
                    <div className="bg-muted px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {t.name} <span className="text-xs text-muted-foreground">({t.report_category})</span>
                        {isCompleted && <Badge className="bg-green-600">Saved</Badge>}
                        {isPending && <Badge variant="outline" className="border-amber-500 text-amber-700">Pending</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        {!isCompleted && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={isPending} onCheckedChange={() => togglePending(t.id)} />
                            <Clock className="w-3 h-3" /> Results pending
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={pdfIncludeTestIds.has(t.id)}
                            onCheckedChange={() => togglePdfInclude(t.id)}
                            disabled={isPending}
                          />
                          <Printer className="w-3 h-3" /> Include in PDF
                        </label>
                      </div>
                    </div>
                    {!isPending && (
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
                                    <TableCell colSpan={5} className="font-bold text-xs">{p.category_heading}</TableCell>
                                  </TableRow>
                                )}
                                <TableRow key={p.id}>
                                  <TableCell>
                                    <div className="font-medium">{p.parameter_name}</div>
                                    {p.has_subranges && (
                                      <Select value={row.subrange_id ?? ""} onValueChange={(v) => updateResult(p.id, { subrange_id: v })}>
                                        <SelectTrigger className="h-7 mt-1 text-xs"><SelectValue placeholder="Select sub-range" /></SelectTrigger>
                                        <SelectContent className="z-[10000]">
                                          {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.label} ({s.ref_display})</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    )}
                                    {p.is_optional && !isCompleted && (
                                      <label className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                        <Checkbox checked={row.skipped} onCheckedChange={(v) => updateResult(p.id, { skipped: !!v })} /> Skip
                                      </label>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">{range.display ?? "—"}</TableCell>
                                  <TableCell className="text-xs">{p.unit ?? "—"}</TableCell>
                                  <TableCell>
                                    <Input value={row.result_value} disabled={row.skipped || isCompleted} onChange={(e) => updateResult(p.id, { result_value: e.target.value })} placeholder="e.g. 5.2 or <0.1" />
                                  </TableCell>
                                  <TableCell>{row.flag && <Badge variant="outline" className={flagBadgeClass(row.flag)}>{row.flag}</Badge>}</TableCell>
                                </TableRow>
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                );
              })}

            <div>
              <Label>Interpretation / Notes</Label>
              <Textarea rows={4} value={interpretation} onChange={(e) => setInterpretation(e.target.value)} placeholder="Clinical interpretation, advice, etc." />
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 4 && (
          <div className="text-center py-10 space-y-4">
            <FileText className="w-14 h-14 mx-auto text-blue-600" />
            <h3 className="text-xl font-semibold">Saved</h3>
            <p className="text-sm text-muted-foreground">
              {pendingTestIds.size > 0
                ? `Saved as PARTIAL — ${pendingTestIds.size} test(s) still pending. You can come back via patient search to add them.`
                : "Report finalized."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetWizard}>Start New Report</Button>
            </div>
          </div>
        )}

        {/* Footer nav */}
        {step < 4 && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              {step === 3 && (
                <>
                  {pendingTestIds.size > 0 && (
                    <Button variant="outline" disabled={submitting || (!canSave && fillingTestIds.length > 0)} onClick={() => saveReport("partial")}>
                      <Save className="w-4 h-4 mr-1" /> Save Partial
                    </Button>
                  )}
                  <Button disabled={submitting || pendingTestIds.size > 0 || !canSave} onClick={() => saveReport("final")}>
                    <Save className="w-4 h-4 mr-1" /> Save
                  </Button>
                </>
              )}
              {step < 3 && (
                <Button disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !canNextFromStep2)} onClick={() => setStep((s) => s + 1)}>
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
