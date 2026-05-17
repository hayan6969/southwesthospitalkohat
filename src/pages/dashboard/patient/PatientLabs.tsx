import { useEffect, useState } from "react";
import { useLabReports } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { Activity, User, Calendar, Download, ExternalLink, Printer, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePathologyReportPDF, type PathologyPdfData } from "@/utils/pathologyPdfGenerator";

export default function PatientLabs() {
  const { profile } = useAuth();
  const { data: labReports, isLoading } = useLabReports();

  const patientLabs = labReports?.filter(lab => lab.patient_id === profile?.id) || [];

  const [pathReports, setPathReports] = useState<any[]>([]);
  const [pathLoading, setPathLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setPathLoading(true);
      const { data, error } = await supabase
        .from("lab_pathology_reports")
        .select("id, report_number, status, reported_at, created_at, referred_by, sample_type, lab_pathology_report_test_types(lab_test_types(name))")
        .eq("patient_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) toast.error("Failed to load pathology reports");
      setPathReports(data ?? []);
      setPathLoading(false);
    })();
  }, [profile?.id]);

  const handleDownloadResult = async (resultFileUrl: string) => {
    try {
      let filePath = resultFileUrl;
      if (resultFileUrl.startsWith('https://')) {
        const urlParts = resultFileUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'lab-results');
        if (bucketIndex !== -1 && urlParts.length > bucketIndex + 1) {
          filePath = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          filePath = urlParts[urlParts.length - 1];
        }
      }
      const { data, error } = await supabase.storage.from('lab-results').download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop() || 'lab-result';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download lab result");
    }
  };

  const handlePrintPathology = async (reportId: string) => {
    setPrintingId(reportId);
    try {
      const { data: r, error: e1 } = await supabase.from("lab_pathology_reports").select("*").eq("id", reportId).single();
      if (e1 || !r) throw new Error("Report not found");
      const { data: tts } = await supabase.from("lab_pathology_report_test_types").select("test_type_id, sort_order, lab_test_types(*)").eq("report_id", reportId).order("sort_order");
      const testTypeIds = (tts ?? []).map((t: any) => t.test_type_id);
      const { data: params } = await supabase.from("lab_test_parameters").select("*").in("test_type_id", testTypeIds).order("sort_order");
      const { data: results } = await supabase.from("lab_pathology_report_results").select("*").eq("report_id", reportId);
      const paramIds = (params ?? []).map((p: any) => p.id);
      const { data: subrangesAll } = paramIds.length > 0
        ? await supabase.from("lab_parameter_subranges").select("*").in("parameter_id", paramIds).order("sort_order")
        : { data: [] as any[] };
      const phone = (await supabase.from("profiles").select("phone").eq("id", r.patient_id).single()).data?.phone ?? null;

      const pdfData: PathologyPdfData = {
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
              result_value: res?.result_value ?? null,
              flag: (res?.flag ?? null) as "Low" | "High" | "Borderline" | null,
              subrange_used: res?.subrange_used ?? null,
              subrange_id: res?.subrange_id ?? null,
              display_all_subranges: !!p.display_all_subranges,
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

      // Only completed tests
      const ready = pdfData.testTypes.filter((t) => t.parameters.some((p) => p.result_value !== null && p.result_value !== ""));
      if (ready.length === 0) { toast.error("No completed results yet"); return; }
      await generatePathologyReportPDF({ ...pdfData, testTypes: ready });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate PDF");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Reports</h1>
          <p className="text-gray-600 mt-1">View your laboratory test results</p>
        </div>
      </div>

      {/* Pathology Reports (new lab) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Pathology Reports
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report #</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pathLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6">Loading…</TableCell></TableRow>
              ) : pathReports.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No pathology reports yet</TableCell></TableRow>
              ) : (
                pathReports.map((r: any) => {
                  const tests = (r.lab_pathology_report_test_types || []).map((tt: any) => tt.lab_test_types?.name).filter(Boolean);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.report_number}</TableCell>
                      <TableCell className="text-xs max-w-[280px]">
                        <div className="flex flex-wrap gap-1">
                          {tests.length === 0 ? "—" : tests.map((n: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{r.referred_by || "—"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "final" ? "default" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={printingId === r.id} onClick={() => handlePrintPathology(r.id)}>
                          <Printer className="w-3 h-3 mr-1" />
                          {printingId === r.id ? "..." : "PDF"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Legacy lab reports */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Test Results
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Date</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Ordered By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patientLabs.length > 0 ? (
                patientLabs.map((lab) => (
                  <TableRow key={lab.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {format(new Date(lab.test_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{lab.test_name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            Dr. {(lab.doctor as any)?.profiles?.first_name} {(lab.doctor as any)?.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lab.doctor?.specialization}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        lab.status === 'completed' ? 'bg-green-100 text-green-700' :
                        lab.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {lab.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {lab.results || 'Results pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         {lab.status === 'completed' && lab.result_file_url && (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleDownloadResult(lab.result_file_url!)}
                           >
                             <Download className="w-3 h-3 mr-1" />
                             Download Results
                           </Button>
                         )}
                        {lab.status === 'completed' && lab.results && !lab.result_file_url && (
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                        )}
                        {lab.status === 'pending' && (
                          <span className="text-sm text-gray-500">Results pending</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                    No lab reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
