import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, PackageCheck, RefreshCw, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";

type OrderRow = {
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
    wards?: { name: string } | null;
    beds?: { bed_number: string } | null;
  } | null;
};

const STATUS_FILTERS = ["dispensed", "received", "administered", "pending", "all"] as const;

export function IPDPharmacyOrders() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("dispensed");
  const { data: patientNames } = usePatientNames();

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("ipd_medicine_orders")
      .select("*, ipd_admissions!inner(admission_number, patient_id, wards(name), beds(bed_number))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("ipd-pharmacy-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_medicine_orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markReceived = async (id: string) => {
    const { error } = await supabase
      .from("ipd_medicine_orders")
      .update({
        status: "received",
        received_by: profile?.id,
        received_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as received");
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
          <PackageCheck className="w-4 h-4" />Pharmacy Orders
        </CardTitle>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
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
          <p className="text-sm text-muted-foreground text-center py-6">No pharmacy orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Ward / Bed</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dose / Freq</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const a = r.ipd_admissions;
                  const name = a ? getPatientName(a.patient_id, patientNames || []) : "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="font-mono text-xs">{a?.admission_number ?? "—"}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell className="text-xs">
                        {a?.wards?.name ? `${a.wards.name} / ${a.beds?.bed_number ?? "—"}` : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{r.medicine_name}</TableCell>
                      <TableCell className="text-xs">{[r.dosage, r.frequency].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell className="text-xs font-medium">{formatPkrAmount(r.quantity * r.unit_price)}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(r.status)} variant="outline">{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "dispensed" && (
                          <Button size="sm" onClick={() => markReceived(r.id)}>
                            <UserCheck className="w-3 h-3 mr-1" />Mark Received
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