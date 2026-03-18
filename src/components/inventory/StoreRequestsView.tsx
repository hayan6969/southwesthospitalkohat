
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

export function StoreRequestsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("approved");

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

  // Resolve requester profiles + departments
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; role: string; department: string }>>({});
  const [departments, setDepartments] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("departments").select("id, name").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((d: any) => { map[d.id] = d.name; });
      setDepartments(map);
    });
  }, []);

  useEffect(() => {
    const ids = [...new Set(requests?.map((r: any) => r.requested_by) || [])];
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, first_name, last_name, role, department_id").in("id", ids).then(({ data }) => {
      const map: Record<string, { name: string; role: string; department: string }> = {};
      data?.forEach((p: any) => {
        map[p.id] = {
          name: `${p.first_name} ${p.last_name}`,
          role: p.role,
          department: departments[p.department_id] || "-",
        };
      });
      setProfileMap(map);
    });
  }, [requests, departments]);

  const deductStock = async (req: any) => {
    const table = req.item_type === "lab" ? "lab_inventory_items" : "inventory_items";
    const { data: items } = await supabase
      .from(table)
      .select("id, stock_quantity")
      .eq("name", req.item_name)
      .limit(1);
    
    if (items && items.length > 0) {
      const currentStock = items[0].stock_quantity;
      const deductQty = Number(req.quantity) || 0;
      const newQty = Math.max(0, currentStock - deductQty);
      await supabase.from(table).update({ stock_quantity: newQty }).eq("id", items[0].id);
    }
  };

  const [providingIds, setProvidingIds] = useState<Set<string>>(new Set());

  const provideMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const req = requests?.find((r: any) => r.id === id);
      
      // Deduct stock FIRST before marking as provided
      if (req) await deductStock(req);

      const updateData: any = {
        status: "provided",
        provided_by: user?.id,
        provided_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("inventory_requests").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id }) => {
      setProvidingIds(prev => new Set(prev).add(id));
    },
    onSuccess: (_, { id }) => {
      setProvidingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ["store-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["lab-inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-general"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-lab"] });
      toast.success("Marked as provided & stock updated");
    },
    onError: (e: any, { id }) => {
      setProvidingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast.error(e.message);
    },
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
                <TableHead>Department</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center">Loading...</TableCell></TableRow>
              ) : requests?.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No requests</TableCell></TableRow>
              ) : requests?.map((req: any) => {
                const prof = profileMap[req.requested_by];
                return (
                  <TableRow key={req.id}>
                    <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {prof?.name || "..."}
                      </div>
                      <div className="text-xs text-muted-foreground">{prof?.role || ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{prof?.department || "-"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{req.item_name}</TableCell>
                    <TableCell><Badge variant="outline">{req.item_type}</Badge></TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell className="text-sm">
                      {req.location ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{req.location}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell><Badge variant={req.status === "provided" ? "outline" : "default"}>{req.status}</Badge></TableCell>
                    <TableCell>{req.expense_amount ? formatPkrAmount(req.expense_amount) : "-"}</TableCell>
                    <TableCell>
                    {req.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => provideMutation.mutate({ id: req.id })}>
                          <Package className="w-3 h-3 mr-1" /> Provide
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </>
  );
}
