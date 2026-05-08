import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { formatInPakistanTime } from "@/utils/timezone";

export default function VerifyReport() {
  const { reportNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: rep }, { data: hosp }] = await Promise.all([
          supabase.rpc("verify_pathology_report", { p_report_number: reportNumber as string }),
          supabase.from("hospital_settings").select("hospital_name, hospital_address, contact_number, logo_url").limit(1).single(),
        ]);
        setReport(rep);
        setHospital(hosp);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportNumber]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl shadow-sm max-w-md w-full p-8 text-center">
        {hospital?.logo_url && (
          <img src={hospital.logo_url} alt="logo" className="w-16 h-16 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-xl font-bold">{hospital?.hospital_name || "Hospital"}</h1>
        <p className="text-xs text-muted-foreground mb-6">{hospital?.hospital_address}</p>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying report…</p>
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
              <h2 className="text-lg font-semibold">Report Verified</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Authentic record from our database
              </p>
            </div>
            <div className="text-left bg-muted/40 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Report No:</span><span className="font-medium">{report.report_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Patient:</span><span className="font-medium">{report.first_name} {report.last_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">PID:</span><span className="font-medium">{report.patient_number || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="font-medium capitalize">{report.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reported:</span><span className="font-medium">{report.reported_at ? formatInPakistanTime(report.reported_at, "dd MMM yyyy, hh:mm a") : "—"}</span></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6">
            <XCircle className="w-14 h-14 text-destructive" />
            <h2 className="text-lg font-semibold">Report Not Found</h2>
            <p className="text-xs text-muted-foreground">No report found with number <span className="font-mono">{reportNumber}</span>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
