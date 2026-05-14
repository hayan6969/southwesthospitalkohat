import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { TreatmentChartDialog } from "./TreatmentChartDialog";
import { DischargeBillDialog } from "./DischargeBillDialog";

export function ActiveAdmissions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartFor, setChartFor] = useState<any>(null);
  const [billFor, setBillFor] = useState<any>(null);
  const { data: patientNames } = usePatientNames();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ipd_admissions")
      .select("*, beds(bed_number), wards(name)")
      .eq("status", "admitted")
      .order("admission_date", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ipd_active")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_admissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const discharge = async (id: string) => {
    if (!confirm("Discharge without final bill? (Use 'Discharge & Bill' for full settlement)")) return;
    const { error } = await supabase.from("ipd_admissions").update({
      status: "discharged",
      discharge_date: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Patient discharged");
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Admitted Patients ({rows.length})</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active admissions.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Ward / Bed</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Admitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.admission_number}</TableCell>
                    <TableCell>{getPatientName(r.patient_id, patientNames || [])}</TableCell>
                    <TableCell><Badge variant="outline">{r.wards?.name} / Bed {r.beds?.bed_number}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{r.provisional_diagnosis || r.chief_complaint || "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(r.admission_date), "MMM d, HH:mm")}</TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setChartFor(r)}>Chart</Button>
                      <Button size="sm" variant="outline" onClick={() => discharge(r.id)}>Discharge</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {chartFor && (
        <TreatmentChartDialog
          open={!!chartFor}
          onOpenChange={(o) => !o && setChartFor(null)}
          admissionId={chartFor.id}
          patientName={getPatientName(chartFor.patient_id, patientNames || [])}
          admissionNumber={chartFor.admission_number}
        />
      )}
    </Card>
  );
}
