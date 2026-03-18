
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export function InventoryRequestsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["inventory-requests-manager", filter],
    queryFn: async () => {
      let query = supabase.from("inventory_requests").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Resolve requester names + departments
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

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_requests").update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-requests-manager"] });
      toast.success("Request approved — now visible to Store");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("inventory_requests").update({
        status: "rejected",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-requests-manager"] });
      toast.success("Request rejected");
    },
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Supply Requests</CardTitle>
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "provided", "all"].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Button>
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
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
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
                    <div>{prof?.name || "..."}</div>
                    <div className="text-xs text-muted-foreground">{prof?.role || ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">
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
                  <TableCell className="text-sm max-w-[200px] truncate">{req.reason || "-"}</TableCell>
                  <TableCell><Badge variant={statusColor(req.status) as any}>{req.status}</Badge></TableCell>
                  <TableCell>
                    {req.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => approveMutation.mutate(req.id)} title="Approve">
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          const reason = prompt("Rejection reason:");
                          if (reason) rejectMutation.mutate({ id: req.id, reason });
                        }} title="Reject">
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
