import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Pill, UserCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admissionId: string;
  admissionNumber: string;
  patientName: string;
}

type OrderRow = {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  quantity: number;
  unit_price: number;
  status: string;
  notes: string | null;
  created_at: string;
  dispensed_at: string | null;
  received_at: string | null;
  administered_at: string | null;
  dispensed_by: string | null;
  received_by: string | null;
  administered_by: string | null;
  ordered_by: string | null;
};

export function PharmacyOrderHistoryDialog({ open, onOpenChange, admissionId, admissionNumber, patientName }: Props) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ipd_medicine_orders")
      .select("*")
      .eq("admission_id", admissionId)
      .order("created_at", { ascending: false });
    setOrders((data as any) ?? []);
    setLoading(false);
  }, [admissionId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

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

  const markAdministered = async (id: string) => {
    const { error } = await supabase
      .from("ipd_medicine_orders")
      .update({
        status: "administered",
        administered_by: profile?.id,
        administered_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as administered");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Pharmacy Orders — {patientName}
            <span className="text-sm text-muted-foreground font-mono">({admissionNumber})</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pharmacy orders for this admission.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dose / Freq / Route</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{format(new Date(o.created_at), "MMM d HH:mm")}</TableCell>
                    <TableCell className="font-medium">{o.medicine_name}</TableCell>
                    <TableCell className="text-xs">{[o.dosage, o.frequency, o.route].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell className="text-xs font-medium">{formatPkrAmount(o.quantity * o.unit_price)}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge(o.status)} variant="outline">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      {o.dispensed_at && (
                        <div className="flex items-center gap-1 text-blue-700">
                          <Clock className="w-3 h-3" />Dispensed {format(new Date(o.dispensed_at), "MMM d HH:mm")}
                        </div>
                      )}
                      {o.received_at && (
                        <div className="flex items-center gap-1 text-green-700">
                          <UserCheck className="w-3 h-3" />Received {format(new Date(o.received_at), "MMM d HH:mm")}
                        </div>
                      )}
                      {o.administered_at && (
                        <div className="flex items-center gap-1 text-purple-700">
                          <Pill className="w-3 h-3" />Administered {format(new Date(o.administered_at), "MMM d HH:mm")}
                        </div>
                      )}
                      {!o.dispensed_at && !o.received_at && !o.administered_at && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {o.status === "dispensed" && (
                        <Button size="sm" onClick={() => markReceived(o.id)}>
                          <UserCheck className="w-3 h-3 mr-1" />Mark Received
                        </Button>
                      )}
                      {o.status === "received" && (
                        <Button size="sm" variant="outline" onClick={() => markAdministered(o.id)}>
                          <Pill className="w-3 h-3 mr-1" />Administer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3 flex items-center gap-4">
          <span><Badge className="bg-yellow-100 text-yellow-800" variant="outline">pending</Badge> Ordered</span>
          <span><Badge className="bg-blue-100 text-blue-800" variant="outline">dispensed</Badge> Pharmacy prepared</span>
          <span><Badge className="bg-green-100 text-green-800" variant="outline">received</Badge> IPD received</span>
          <span><Badge className="bg-purple-100 text-purple-800" variant="outline">administered</Badge> Given to patient</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}