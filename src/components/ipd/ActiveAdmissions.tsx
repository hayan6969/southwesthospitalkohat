import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Pill, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { TreatmentChartDialog } from "./TreatmentChartDialog";
import { DischargeBillDialog } from "./DischargeBillDialog";
import { PharmacyOrderHistoryDialog } from "./PharmacyOrderHistoryDialog";
import { AdmissionFormDialog } from "./AdmissionFormDialog";
import { CollectAdvanceDialog } from "./CollectAdvanceDialog";
import { formatPkrAmount } from "@/utils/currency";

interface BalanceInfo {
  accrued: number;
  deposit: number;
  balance: number;
}

export function ActiveAdmissions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartFor, setChartFor] = useState<any>(null);
  const [billFor, setBillFor] = useState<any>(null);
  const [pharmacyFor, setPharmacyFor] = useState<any>(null);
  const [admissionFormFor, setAdmissionFormFor] = useState<any>(null);
  const [advanceFor, setAdvanceFor] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, BalanceInfo>>({});
  const [orderCounts, setOrderCounts] = useState<Record<string, { pending: number; dispensed: number }>>({});
  const { profile } = useAuth();
  const { data: patientNames } = usePatientNames();
  const isDoctor = profile?.role === "doctor";
  const isAdmin = profile?.role === "admin";
  const canDischarge = isDoctor || isAdmin;

  const calcBalance = useCallback(async (admission: any): Promise<BalanceInfo> => {
    const admDate = new Date(admission.admission_date);
    const days = Math.max(1, Math.ceil((Date.now() - admDate.getTime()) / 86400000));

    const [bedRes, medRes, labRes, docRes, invoiceRes] = await Promise.all([
      admission.bed_id
        ? supabase.from("beds").select("daily_charge").eq("id", admission.bed_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase
        .from("ipd_medicine_orders")
        .select("quantity, unit_price")
        .eq("admission_id", admission.id)
        .in("status", ["dispensed", "received", "administered"]),
      supabase
        .from("ipd_lab_orders")
        .select("charge")
        .eq("admission_id", admission.id)
        .eq("status", "completed"),
      admission.doctor_id
        ? supabase.from("doctors").select("consultation_fee").eq("id", admission.doctor_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase
        .from("ipd_invoices")
        .select("paid_amount")
        .eq("admission_id", admission.id)
        .maybeSingle(),
    ]);

    const bedCharge = days * Number(bedRes.data?.daily_charge || 0);
    const medicineCharge = (medRes.data ?? []).reduce((s: number, m: any) => s + Number(m.quantity || 1) * Number(m.unit_price || 0), 0);
    const labCharge = (labRes.data ?? []).reduce((s: number, l: any) => s + Number(l.charge || 0), 0);
    const docCharge = Number(docRes.data?.consultation_fee || 0);
    const deposit = Number(invoiceRes.data?.paid_amount || 0);
    const accrued = bedCharge + medicineCharge + labCharge + docCharge;

    return { accrued, deposit, balance: Math.max(0, accrued - deposit) };
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ipd_admissions")
      .select("*, beds(bed_number), wards(name)")
      .eq("status", "admitted")
      .order("admission_date", { ascending: false });
    setRows(data ?? []);

    if (data && data.length > 0) {
      const ids = data.map((r: any) => r.id);

      const [{ data: orders }] = await Promise.all([
        supabase
          .from("ipd_medicine_orders")
          .select("admission_id, status")
          .in("admission_id", ids)
          .in("status", ["pending", "dispensed"]),
      ]);

      const counts: Record<string, { pending: number; dispensed: number }> = {};
      (orders ?? []).forEach((o: any) => {
        if (!counts[o.admission_id]) counts[o.admission_id] = { pending: 0, dispensed: 0 };
        counts[o.admission_id][o.status as "pending" | "dispensed"]++;
      });
      setOrderCounts(counts);

      const balanceMap: Record<string, BalanceInfo> = {};
      await Promise.all(
        data.map(async (r: any) => {
          balanceMap[r.id] = await calcBalance(r);
        })
      );
      setBalances(balanceMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ipd_active")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_admissions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_invoices" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_charges" }, () => load())
      .subscribe();

    const interval = setInterval(load, 30000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
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
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Admitted Patients ({rows.length})</span>
          <span className="text-sm font-normal text-muted-foreground">
            Auto-refreshes every 30s
          </span>
        </CardTitle>
      </CardHeader>
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
                  <TableHead>Balance</TableHead>
                  <TableHead>Admitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => {
                  const c = orderCounts[r.id];
                  const b = balances[r.id];
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
                      <TableCell>
                        {b ? (
                          <div className="space-y-0.5 min-w-[120px]">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Accrued:</span>
                              <span className="font-medium">{formatPkrAmount(b.accrued)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Deposit:</span>
                              <span className="font-medium text-green-600">{formatPkrAmount(b.deposit)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold border-t pt-0.5">
                              <span>Balance:</span>
                              <span className={b.balance > 0 ? "text-red-600" : "text-green-600"}>
                                {b.balance > 0 ? formatPkrAmount(b.balance) : "Cleared"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(r.admission_date), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => setChartFor(r)}>Chart</Button>
                          <Button size="sm" variant="outline" onClick={() => setAdvanceFor(r)} className="gap-1">
                            <Banknote className="w-3 h-3" />Advance
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPharmacyFor(r)} className="gap-1"><Pill className="w-3 h-3" />Pharmacy</Button>
                          <Button size="sm" variant="outline" onClick={() => setAdmissionFormFor(r)} className="gap-1">Form</Button>
                          {isAdmin && (
                            <>
                              <Button size="sm" onClick={() => setBillFor(r)}>Discharge & Bill</Button>
                              <Button size="sm" variant="ghost" onClick={() => discharge(r.id)}>Quick</Button>
                            </>
                          )}
                          {isDoctor && !isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => discharge(r.id)}>
                              Discharge
                            </Button>
                          )}
                        </div>
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
      {advanceFor && (
        <CollectAdvanceDialog
          open={!!advanceFor}
          onOpenChange={(o) => !o && setAdvanceFor(null)}
          admission={advanceFor}
          currentDeposit={balances[advanceFor.id]?.deposit || 0}
          onCollected={load}
        />
      )}
    </Card>
  );
}
