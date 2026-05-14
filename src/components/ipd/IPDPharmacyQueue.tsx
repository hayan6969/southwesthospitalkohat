import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Pill, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Row = {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  quantity: number;
  status: string;
  created_at: string;
  admission_id: string;
  ipd_admissions?: {
    admission_number: string;
    patient_id: string;
    profiles?: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

export function IPDPharmacyQueue() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "dispensed" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("ipd_medicine_orders")
      .select("*, ipd_admissions(admission_number, patient_id, profiles:patient_id(first_name, last_name))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const ch = supabase
      .channel("ipd-pharmacy-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_medicine_orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dispense = async (id: string) => {
    const { error } = await supabase
      .from("ipd_medicine_orders")
      .update({ status: "dispensed", dispensed_by: profile?.id, dispensed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked dispensed");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Pill className="w-4 h-4" />IPD Medicine Orders</CardTitle>
        <div className="flex items-center gap-1">
          {(["pending", "dispensed", "all"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const p = r.ipd_admissions?.profiles;
                  const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ipd_admissions?.admission_number ?? "—"}</TableCell>
                      <TableCell>{name || "—"}</TableCell>
                      <TableCell className="font-medium">{r.medicine_name}</TableCell>
                      <TableCell className="text-xs">{[r.dosage, r.frequency, r.route].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => dispense(r.id)}>Dispense</Button>
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
