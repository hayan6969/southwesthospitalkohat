import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Pill } from "lucide-react";
import { toast } from "sonner";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { TreatmentChartDialog } from "./TreatmentChartDialog";
import { DischargeBillDialog } from "./DischargeBillDialog";
import { PharmacyOrderHistoryDialog } from "./PharmacyOrderHistoryDialog";
import { AdmissionFormDialog } from "./AdmissionFormDialog";

export function ActiveAdmissions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartFor, setChartFor] = useState<any>(null);
  const [billFor, setBillFor] = useState<any>(null);
  const [pharmacyFor, setPharmacyFor] = useState<any>(null);
  const [admissionFormFor, setAdmissionFormFor] = useState<any>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, { pending: number; dispensed: number }>>({});
  const { data: patientNames } = usePatientNames();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ipd_admissions")
      .select("*, beds(bed_number), wards(name)")
      .eq("status", "admitted")
      .order("admission_date", { ascending: false });
    setRows(data ?? []);

    // Fetch pending/dispensed order counts for all active admissions
    if (data && data.length > 0) {
      const ids = data.map((r: any) => r.id);
      const { data: orders } = await supabase
        .from("ipd_medicine_orders")
        .select("admission_id, status")
        .in("admission_id", ids)
        .in("status", ["pending", "dispensed"]);
      const counts: Record<string, { pending: number; dispensed: number }> = {};
      (orders ?? []).forEach((o: any) => {
        if (!counts[o.admission_id]) counts[o.admission_id] = { pending: 0, dispensed: 0 };
        counts[o.admission_id][o.status as "pending" | "dispensed"]++;
      });
      setOrderCounts(counts);
    }
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
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Admitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => {
                  const c = orderCounts[r.id];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.admission_number}</TableCell>
                      <TableCell>{getPatientName(r.patient_id, patientNames || [])}</TableCell>
                      <TableCell><Badge variant="outline">{r.wards?.name} / Bed {r.beds?.bed_number}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{r.provisional_diagnosis || r.chief_complaint || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {c?.pending ? <Badge className="bg-yellow-100 text-yellow-800" variant="outline">{c.pending} pending</Badge> : null}
                          {c?.dispensed ? <Badge className="bg-blue-100 text-blue-800" variant="outline"><Pill className="w-3 h-3 mr-0.5" />{c.dispensed} ready</Badge> : null}
                          {!c?.pending && !c?.dispensed ? <span className="text-xs text-muted-foreground">—</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(r.admission_date), "MMM d, HH:mm")}</TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setChartFor(r)}>Chart</Button>
                        <Button size="sm" variant="outline" onClick={() => setPharmacyFor(r)} className="gap-1"><Pill className="w-3 h-3" />Pharmacy</Button>
                        <Button size="sm" variant="outline" onClick={() => setAdmissionFormFor(r)} className="gap-1">Form</Button>
                        <Button size="sm" onClick={() => setBillFor(r)}>Discharge & Bill</Button>
                        <Button size="sm" variant="ghost" onClick={() => discharge(r.id)}>Quick</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      {billFor && (
        <DischargeBillDialog
          open={!!billFor}
          onOpenChange={(o) => !o && setBillFor(null)}
          admission={billFor}
          patientName={getPatientName(billFor.patient_id, patientNames || [])}
          onDischarged={load}
        />
      )}
      {pharmacyFor && (
        <PharmacyOrderHistoryDialog
          open={!!pharmacyFor}
          onOpenChange={(o) => !o && setPharmacyFor(null)}
          admissionId={pharmacyFor.id}
          admissionNumber={pharmacyFor.admission_number}
          patientName={getPatientName(pharmacyFor.patient_id, patientNames || [])}
        />
      )}
      {admissionFormFor && (
        <AdmissionFormDialog
          open={!!admissionFormFor}
          onOpenChange={(o) => !o && setAdmissionFormFor(null)}
          admission={admissionFormFor}
          patientName={getPatientName(admissionFormFor.patient_id, patientNames || [])}
        />
      )}
    </Card>
  );
}
