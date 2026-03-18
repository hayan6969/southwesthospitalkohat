
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";

export function RequestSuppliesDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_name: "", item_type: "general", quantity: 1, reason: "" });

  const { data: myRequests } = useQuery({
    queryKey: ["my-inventory-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("requested_by", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
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
    enabled: !!user?.id && open,
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
      setForm({ item_name: "", item_type: "general", quantity: 1, reason: "" });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Request Supplies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Request Supplies</DialogTitle></DialogHeader>
        
        <div className="space-y-4">
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
              <Label>Reason (optional)</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why do you need this?" rows={2} />
            </div>
          </div>
          <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.item_name || createMutation.isPending}>
            Submit Request
          </Button>

          <Tabs defaultValue="requests" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">My Requests</TabsTrigger>
              <TabsTrigger value="received" className="flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" />
                Received This Month
                {receivedThisMonth && receivedThisMonth.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{receivedThisMonth.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="requests">
              {myRequests && myRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM")}</TableCell>
                        <TableCell>{req.item_name}</TableCell>
                        <TableCell>{req.quantity}</TableCell>
                        <TableCell><Badge variant={statusColor(req.status) as any}>{req.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
              )}
            </TabsContent>
            <TabsContent value="received">
              {receivedThisMonth && receivedThisMonth.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Received On</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedThisMonth.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm">{format(new Date(req.provided_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium">{req.item_name}</TableCell>
                        <TableCell><Badge variant="outline">{req.item_type}</Badge></TableCell>
                        <TableCell>{req.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No items received this month</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
