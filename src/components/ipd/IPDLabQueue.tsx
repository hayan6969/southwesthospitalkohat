import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, FlaskConical, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Row = {
  id: string;
  test_name: string;
  status: string;
  result_notes: string | null;
  created_at: string;
  charge: number;
  admission_id: string;
  ipd_admissions?: {
    admission_number: string;
    patient_id: string;
    profiles?: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

export function IPDLabQueue() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");
  const [active, setActive] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("ipd_lab_orders")
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
      .channel("ipd-lab-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_lab_orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const complete = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("ipd_lab_orders")
      .update({ status: "completed", completed_by: profile?.id, completed_at: new Date().toISOString(), result_notes: notes || null })
      .eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked completed");
    setActive(null); setNotes(""); load();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="w-4 h-4" />IPD Lab Orders</CardTitle>
          <div className="flex items-center gap-1">
            {(["pending", "completed", "all"] as const).map(f => (
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
                    <TableHead>Test</TableHead>
                    <TableHead>Charge</TableHead>
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
                        <TableCell className="font-medium">{r.test_name}</TableCell>
                        <TableCell>PKR {Number(r.charge ?? 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell>
                          {r.status === "pending" && (
                            <Button size="sm" onClick={() => { setActive(r); setNotes(""); }}>Complete</Button>
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

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle>Complete Lab Order — {active?.test_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Result notes</label>
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Findings, values, interpretation…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={complete}>Mark Completed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
