import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { formatInPakistanTime } from "@/utils/timezone";

interface Subrange {
  id: string;
  label: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_display: string | null;
}
interface Param {
  parameter_name: string;
  category_heading: string | null;
  unit: string | null;
  ref_display: string | null;
  ref_min: number | null;
  ref_max: number | null;
  display_all_subranges: boolean;
  result_value: string | null;
  flag: string | null;
  subrange_used: string | null;
  subrange_id: string | null;
  subranges: Subrange[];
}
interface TT {
  name: string;
  report_category: string | null;
  method: string | null;
  notes: string | null;
  parameters: Param[];
}
interface FullReport {
  report_number: string;
  status: string;
  reported_at: string | null;
  collected_at: string | null;
  registered_at: string | null;
  created_at: string;
  sample_type: string | null;
  instrument: string | null;
  referred_by: string | null;
  collection_address: string | null;
  interpretation: string | null;
  patient_name: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  patient_number: string | null;
  phone: string | null;
  test_types: TT[];
}

const flagColor = (f: string | null) => {
  if (f === "High") return "text-red-600";
  if (f === "Low") return "text-blue-700";
  if (f === "Borderline") return "text-amber-600";
  return "text-foreground";
};

const fmt = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try { return formatInPakistanTime(iso, "dd MMM yyyy, hh:mm a"); } catch { return iso; }
};

export default function VerifyReport() {
  const { reportNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FullReport | null>(null);
  const [hospital, setHospital] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: rep }, { data: hosp }] = await Promise.all([
          supabase.rpc("verify_pathology_report_full", { p_report_number: reportNumber as string }),
          supabase.from("hospital_settings").select("hospital_name, hospital_address, contact_number, logo_url").limit(1).single(),
        ]);
        setReport(rep as unknown as FullReport);
        setHospital(hosp);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border rounded-xl shadow-sm max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold">{hospital?.hospital_name || "Hospital"}</h1>
          <p className="text-xs text-muted-foreground mb-6">{hospital?.hospital_address}</p>
          <XCircle className="w-14 h-14 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold mt-2">Report Not Found</h2>
          <p className="text-xs text-muted-foreground">No report found with number <span className="font-mono">{reportNumber}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto bg-card border rounded-xl shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="bg-[hsl(210,80%,28%)] text-white rounded-t-xl px-4 sm:px-6 py-4 flex items-center gap-3 print:rounded-none">
          {hospital?.logo_url && (
            <img src={hospital.logo_url} alt="logo" className="w-12 h-12 object-contain bg-white/10 rounded p-1" />
          )}
          <div className="flex-1 text-center">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">{(hospital?.hospital_name || "HOSPITAL").toUpperCase()}</h1>
            <p className="text-xs opacity-90">Accurate | Caring | Instant</p>
          </div>
          <div className="text-right text-xs opacity-90 hidden sm:block">{hospital?.contact_number}</div>
        </div>
        <div className="bg-muted/40 text-center text-xs py-1 px-4 border-b">{hospital?.hospital_address}</div>

        {/* Verified badge */}
        <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border-b border-green-200 text-green-700 text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">Verified Authentic Report</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>

        {/* Patient block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-6 py-4 text-sm border-b">
          <div className="space-y-1">
            <div className="text-lg font-bold">{(report.patient_name || "—").toUpperCase()}</div>
            <div><span className="font-semibold">Age:</span> {report.patient_age ?? "—"} Years &nbsp; <span className="font-semibold">Sex:</span> {report.patient_sex || "—"}</div>
            <div><span className="font-semibold">PID:</span> {report.patient_number || "—"}</div>
            <div><span className="font-semibold">Ref. By:</span> {report.referred_by || "—"}</div>
          </div>
          <div className="space-y-1 sm:text-right">
            <div><span className="font-semibold">Registered:</span> {fmt(report.registered_at)}</div>
            <div><span className="font-semibold">Collected:</span> {fmt(report.collected_at)}</div>
            <div><span className="font-semibold">Reported:</span> {fmt(report.reported_at)}</div>
            <div><span className="font-semibold">Report No:</span> <span className="font-mono">{report.report_number}</span></div>
          </div>
        </div>

        {/* Tests */}
        <div className="px-4 sm:px-6 py-4 space-y-6">
          {report.test_types?.map((tt, idx) => (
            <div key={idx}>
              <div className="text-center mb-2">
                <h2 className="text-base sm:text-lg font-bold uppercase">{tt.name}</h2>
                {tt.report_category && <p className="text-xs text-muted-foreground">{tt.report_category}</p>}
              </div>
              {report.sample_type && (
                <div className="text-xs mb-2"><span className="font-semibold">Primary Sample Type:</span> {report.sample_type}</div>
              )}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left p-2 font-semibold">Investigation</th>
                      <th className="text-left p-2 font-semibold">Result</th>
                      <th className="text-left p-2 font-semibold">Reference Value</th>
                      <th className="text-left p-2 font-semibold">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tt.parameters?.map((p, pi) => {
                      const refText = p.display_all_subranges
                        ? (p.ref_display || "( See Below )")
                        : (p.subrange_used ? `${p.subrange_used}: ${p.ref_display || "—"}` : (p.ref_display || "—"));
                      return (
                        <>
                          {p.category_heading && (pi === 0 || tt.parameters[pi - 1].category_heading !== p.category_heading) && (
                            <tr key={`h-${pi}`}><td colSpan={4} className="p-2 font-bold text-[hsl(210,80%,28%)] border-t">{p.category_heading}</td></tr>
                          )}
                          <tr key={pi} className="border-t">
                            <td className="p-2">{p.parameter_name}</td>
                            <td className={`p-2 font-semibold ${flagColor(p.flag)}`}>
                              {p.result_value ?? "—"}
                              {p.flag && <span className="ml-1 italic text-xs font-normal">{p.flag}</span>}
                            </td>
                            <td className="p-2">{refText}</td>
                            <td className="p-2">{p.unit || "—"}</td>
                          </tr>
                          {p.display_all_subranges && p.subranges?.map((sr) => {
                            const isSel = (p.subrange_id && sr.id === p.subrange_id) || (!p.subrange_id && p.subrange_used === sr.label);
                            return (
                              <tr key={sr.id} className={`border-t text-xs ${isSel ? "bg-yellow-50" : ""}`}>
                                <td className="p-2 pl-6 text-muted-foreground">{sr.label}</td>
                                <td className="p-2"></td>
                                <td className="p-2">{sr.ref_display || (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} - ${sr.ref_max}` : "—")}</td>
                                <td className="p-2">{p.unit || ""}</td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(tt.method || report.instrument) && (
                <p className="text-xs mt-2">
                  {report.instrument && <><span className="font-semibold">Instrument:</span> {report.instrument} &nbsp;|&nbsp; </>}
                  {tt.method && <><span className="font-semibold">Method:</span> {tt.method}</>}
                </p>
              )}
              {tt.notes && <p className="text-xs italic mt-1 text-muted-foreground">{tt.notes}</p>}
            </div>
          ))}

          {report.interpretation && (
            <div className="text-sm">
              <span className="font-semibold">Interpretation: </span>{report.interpretation}
            </div>
          )}

          <div className="text-center font-bold text-sm pt-4">**** End of Report ****</div>
        </div>

        <div className="bg-[hsl(210,80%,28%)] text-white text-xs px-4 py-2 rounded-b-xl flex justify-between print:rounded-none">
          <span>{report.status === "final" ? "FINAL REPORT" : "DRAFT"} · Verified online</span>
          <span>Computer-generated report</span>
        </div>
      </div>
    </div>
  );
}
