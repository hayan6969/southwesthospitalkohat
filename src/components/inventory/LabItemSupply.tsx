
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, PackageCheck, Plus, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";

export function LabItemSupply() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_name: "", quantity: 1, reason: "", location: "" });
  const [stockSearch, setStockSearch] = useState("");

  // Fetch lab inventory items for the request dropdown
  const { data: labItems } = useQuery({
    queryKey: ["lab-inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_inventory_items").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch lab's own stock (aggregated from provided requests)
  const { data: labStock, isLoading } = useQuery({
    queryKey: ["lab-own-stock", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("item_type", "lab")
        .eq("status", "provided")
        .eq("requested_by", user?.id);
      if (error) throw error;
      // Aggregate by item_name
      const stockMap: Record<string, { item_name: string; total_qty: number }> = {};
      (data || []).forEach((req: any) => {
        if (!stockMap[req.item_name]) {
          stockMap[req.item_name] = { item_name: req.item_name, total_qty: 0 };
        }
        stockMap[req.item_name].total_qty += req.quantity;
      });
      return Object.values(stockMap).sort((a, b) => a.item_name.localeCompare(b.item_name));
    },
    enabled: !!user?.id,
  });

  // Fetch departments for location suggestion
  const { data: departments } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data || [];
    },
  });

  const userDeptName = departments?.find((d: any) => d.id === profile?.department_id)?.name;

  // Fetch user's lab supply requests
  const { data: myRequests } = useQuery({
    queryKey: ["my-lab-supply-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("requested_by", user?.id)
        .eq("item_type", "lab")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: receivedThisMonth } = useQuery({
    queryKey: ["my-received-lab-items", user?.id, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("requested_by", user?.id)
        .eq("item_type", "lab")
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
        item_type: "lab",
        requested_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lab-supply-requests"] });
      toast.success("Lab supply request submitted");
      setForm({ item_name: "", quantity: 1, reason: "", location: "" });
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

  const filteredStock = labStock?.filter((item: any) =>
    !stockSearch.trim() || item.item_name.toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Received This Month */}
      {receivedThisMonth && receivedThisMonth.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-green-600" />
              Lab Items Received This Month
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

      {/* Lab Stock Overview (Read-Only) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              My Lab Stock
            </CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Search items..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Total Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                ) : !filteredStock || filteredStock.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No lab items received yet</TableCell></TableRow>
                ) : filteredStock.map((item: any) => (
                  <TableRow key={item.item_name}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.total_qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
      </Card>

      {/* Request Lab Supply */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Request Lab Supply
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
                <Select
                  value={form.item_name}
                  onValueChange={(v) => setForm({ ...form, item_name: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select a lab item..." /></SelectTrigger>
                  <SelectContent>
                    {!labItems || labItems.length === 0 ? (
                      <SelectItem value="__none" disabled>No lab items available</SelectItem>
                    ) : labItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name} — {item.stock_quantity} {item.unit} in stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
              </div>
              <div>
                <Label>Delivery Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={userDeptName ? `e.g. ${userDeptName}, Lab Room` : "e.g. Lab, Room 201"}
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

      {/* My Lab Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Lab Supply Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!myRequests || myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No requests yet</TableCell>
                </TableRow>
              ) : myRequests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{req.item_name}</TableCell>
                  <TableCell>{req.quantity}</TableCell>
                  <TableCell className="text-sm">{req.location || "-"}</TableCell>
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
