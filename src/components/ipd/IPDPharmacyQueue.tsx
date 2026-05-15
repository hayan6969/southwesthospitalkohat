import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { toast } from "sonner";
import { Loader2, Pill, RefreshCw, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

type Row = {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  admission_id: string;
  ipd_admissions?: {
    admission_number: string;
    patient_id: string;
  } | null;
};

const STATUS_GROUPS = ["pending", "dispensed", "received", "administered", "all"] as const;

export function IPDPharmacyQueue() {
  const { profile } = useAuth();
  const { data: patientNames } = usePatientNames();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("ipd_medicine_orders")
        .select("*, ipd_admissions(admission_number, patient_id)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) { toast.error(error.message); return; }
      setRows((data as any) ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
      setRows([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("ipd-pharmacy-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_medicine_orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const dispense = async (id: string, medicineName: string, qty: number) => {
    // Look up the medicine to deduct stock
    const { data: meds } = await supabase
      .from("medicines")
      .select("id, stock_quantity")
      .eq("name", medicineName)
      .maybeSingle();

    if (meds && meds.stock_quantity !== null) {
      if (meds.stock_quantity < qty) {
        toast.error(`Insufficient stock: only ${meds.stock_quantity} available`);
        return;
      }
      const { error: stockErr } = await supabase
        .from("medicines")
        .update({ stock_quantity: meds.stock_quantity - qty })
        .eq("id", meds.id);
      if (stockErr) console.error("Stock deduction failed:", stockErr);
    }

    const { error } = await supabase
      .from("ipd_medicine_orders")
      .update({ status: "dispensed", dispensed_by: profile?.id, dispensed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dispensed — stock deducted");
    load();
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      dispensed: "bg-blue-100 text-blue-800",
      received: "bg-green-100 text-green-800",
      administered: "bg-purple-100 text-purple-800",
    };
    return colors[s] || "";
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageCheck className="w-4 h-4" />IPD Pharmacy Orders
        </CardTitle>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_GROUPS.map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f === "all" ? "All" : f}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dose / Freq / Route</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const pid = r.ipd_admissions?.patient_id;
                  const name = pid ? getPatientName(pid, patientNames || []) : "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ipd_admissions?.admission_number ?? "—"}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell className="font-medium">{r.medicine_name}</TableCell>
                      <TableCell className="text-xs">{[r.dosage, r.frequency, r.route].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell className="text-xs">{formatPkrAmount(r.unit_price || 0)}</TableCell>
                      <TableCell className="text-xs font-medium">{formatPkrAmount((r.quantity || 0) * (r.unit_price || 0))}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(r.status)} variant="outline">{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => dispense(r.id, r.medicine_name, r.quantity)}>
                            <Pill className="w-3 h-3 mr-1" />Dispense
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
