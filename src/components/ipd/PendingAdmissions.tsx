import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AdmitPatientDialog } from "./AdmitPatientDialog";
import { Loader2 } from "lucide-react";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";

export function PendingAdmissions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const { data: patientNames } = usePatientNames();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ipd_admissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ipd_pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_admissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Admissions ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pending admissions.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.admission_number}</TableCell>
                    <TableCell>{getPatientName(r.patient_id, patientNames || [])}</TableCell>
                    <TableCell><Badge variant="secondary">{r.source}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{r.chief_complaint || "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setSelected(r)}>Admit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {selected && (
        <AdmitPatientDialog
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          admission={selected}
          onAdmitted={load}
        />
      )}
    </Card>
  );
}
