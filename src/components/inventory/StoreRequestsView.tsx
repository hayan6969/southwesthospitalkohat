
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

export function StoreRequestsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("approved");
  const [expenseDialog, setExpenseDialog] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({ amount: 0, bill_number: "", description: "" });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["store-requests", filter],
    queryFn: async () => {
      let query = supabase.from("inventory_requests").select("*").order("created_at", { ascending: false });
      if (filter === "approved") query = query.eq("status", "approved");
      else if (filter === "provided") query = query.eq("status", "provided");
      else query = query.in("status", ["approved", "provided"]);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = [...new Set(requests?.map((r: any) => r.requested_by) || [])];
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, first_name, last_name, role").in("id", ids).then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = `${p.first_name} ${p.last_name} (${p.role})`; });
      setProfileMap(map);
    });
  }, [requests]);

  const provideMutation = useMutation({
    mutationFn: async ({ id, expense_amount, expense_bill_number }: { id: string; expense_amount?: number; expense_bill_number?: string }) => {
      const updateData: any = {
        status: "provided",
        provided_by: user?.id,
        provided_at: new Date().toISOString(),
      };
      if (expense_amount) {
        updateData.expense_amount = expense_amount;
        updateData.expense_bill_number = expense_bill_number;
      }
      const { error } = await supabase.from("inventory_requests").update(updateData).eq("id", id);
      if (error) throw error;

      // If expense, also add to finance expenses
      if (expense_amount && expense_amount > 0) {
        await supabase.from("expenses").insert({
          amount: expense_amount,
          category: "Store / Inventory",
          description: `Store expense for: ${expenseDialog?.item_name} (Bill: ${expense_bill_number || 'N/A'})`,
          created_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-requests"] });
      toast.success("Marked as provided");
      setExpenseDialog(null);
      setExpenseForm({ amount: 0, bill_number: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Approved Requests</CardTitle>
          <div className="flex gap-2">
            {["approved", "provided", "all"].map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : requests?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No requests</TableCell></TableRow>
              ) : requests?.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm">{profileMap[req.requested_by] || "..."}</TableCell>
                  <TableCell className="font-medium">{req.item_name}</TableCell>
                  <TableCell>{req.quantity}</TableCell>
                  <TableCell><Badge variant={req.status === "provided" ? "outline" : "default"}>{req.status}</Badge></TableCell>
                  <TableCell>{req.expense_amount ? formatPkrAmount(req.expense_amount) : "-"}</TableCell>
                  <TableCell>
                    {req.status === "approved" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => provideMutation.mutate({ id: req.id })}>
                          <Package className="w-3 h-3 mr-1" /> Provide
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setExpenseDialog(req); setExpenseForm({ amount: 0, bill_number: "", description: "" }); }}>
                          <Receipt className="w-3 h-3 mr-1" /> + Expense
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!expenseDialog} onOpenChange={(v) => { if (!v) setExpenseDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Provide with Expense - {expenseDialog?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Expense Amount (PKR)</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: +e.target.value })} /></div>
            <div><Label>Bill Number</Label><Input value={expenseForm.bill_number} onChange={(e) => setExpenseForm({ ...expenseForm, bill_number: e.target.value })} /></div>
            <Button className="w-full" onClick={() => provideMutation.mutate({ id: expenseDialog.id, expense_amount: expenseForm.amount, expense_bill_number: expenseForm.bill_number })} disabled={expenseForm.amount <= 0 || provideMutation.isPending}>
              Mark as Provided & Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
