
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, PackageCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";

export function MySupplyRequests() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ item_name: "", item_type: "general", quantity: 1, reason: "", location: "" });
  const [showForm, setShowForm] = useState(false);

  // Fetch all inventory items for dropdown
  const { data: generalItems } = useQuery({
    queryKey: ["inventory-items-list"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_items").select("id, name, stock_quantity, unit").order("name");
      return (data || []).map((i: any) => ({ ...i, source: "general" }));
    },
  });

  const { data: labItems } = useQuery({
    queryKey: ["lab-inventory-items-list"],
    queryFn: async () => {
      const { data } = await supabase.from("lab_inventory_items").select("id, name, stock_quantity, unit").order("name");
      return (data || []).map((i: any) => ({ ...i, source: "lab" }));
    },
  });

  const allItems = [...(generalItems || []), ...(labItems || [])];

  const { data: departments } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data || [];
    },
  });

  // Get user's department name
  const userDeptName = departments?.find((d: any) => d.id === profile?.department_id)?.name;

  const { data: myRequests } = useQuery({
    queryKey: ["my-inventory-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("requested_by", user?.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: receivedThisMonth } = useQuery({
    queryKey: ["my-received-items", user?.id, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("requested_by", user?.id)
        .eq("status", "provided")
        .gte("provided_at", monthStart)
        .order("provided_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("inventory_requests").insert({
        ...data,
        requested_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-inventory-requests"] });
      toast.success("Supply request submitted");
      setForm({ item_name: "", item_type: "general", quantity: 1, reason: "", location: "" });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "rejected": return "destructive";
      case "provided": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Received This Month Summary */}
      {receivedThisMonth && receivedThisMonth.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-green-600" />
              Items Received This Month
              <Badge variant="secondary" className="ml-auto">{receivedThisMonth.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {receivedThisMonth.map((req: any) => (
                <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{req.item_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {req.quantity} · {format(new Date(req.provided_at), "dd MMM")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Request Supplies
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Request
          </Button>
        </CardHeader>
        {showForm && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Item Name</Label>
                <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="e.g. Whiteboard Marker, A4 Paper" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Delivery Location / Department</Label>
                <Input 
                  value={form.location} 
                  onChange={(e) => setForm({ ...form, location: e.target.value })} 
                  placeholder={userDeptName ? `e.g. ${userDeptName}, Room 201` : "e.g. OPD, Lab, Room 201"}
                />
              </div>
              <div className="col-span-2">
                <Label>Reason (optional)</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why do you need this?" rows={2} />
              </div>
              <div className="col-span-2">
                <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.item_name || !form.location || createMutation.isPending}>
                  Submit Request
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* My Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!myRequests || myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No requests yet</TableCell>
                </TableRow>
              ) : myRequests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{req.item_name}</TableCell>
                  <TableCell><Badge variant="outline">{req.item_type}</Badge></TableCell>
                  <TableCell>{req.quantity}</TableCell>
                  <TableCell className="text-sm">{(req as any).location || "-"}</TableCell>
                  <TableCell><Badge variant={statusColor(req.status) as any}>{req.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
