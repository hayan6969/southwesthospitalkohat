import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, ChevronDown, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

// lab_store_batches isn't in the generated Supabase types yet — use a loose handle.
const db = supabase as any;

const DAY = 86400000;
const today = () => new Date(new Date().toDateString());

interface StoreBatch {
  id: string;
  item_id: string;
  batch_number: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  units_received: number;
  units_remaining: number;
  tests_per_unit: number;
  is_active: boolean;
  created_at: string;
}

export function LabStoreStockManager() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [recvDialog, setRecvDialog] = useState(false);
  const [recvItem, setRecvItem] = useState<any>(null);
  const [recvForm, setRecvForm] = useState({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: 1 });

  const { data: items } = useQuery({
    queryKey: ["lab-inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_inventory_items").select("*").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["lab-store-batches"],
    queryFn: async () => {
      const { data, error } = await db.from("lab_store_batches").select("*").eq("is_active", true).order("expiry_date", { nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as StoreBatch[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Per-item aggregation: units on hand (non-expired), expired units, soonest expiry, batch count.
  const stats = useMemo(() => {
    const map = new Map<string, { unitsRemaining: number; expired: number; soonest: string | null; batchCount: number }>();
    (batches ?? []).forEach((b) => {
      const cur = map.get(b.item_id) ?? { unitsRemaining: 0, expired: 0, soonest: null, batchCount: 0 };
      const isExpired = b.expiry_date ? new Date(b.expiry_date) < today() : false;
      cur.batchCount += 1;
      if (isExpired) {
        cur.expired += b.units_remaining;
      } else {
        cur.unitsRemaining += b.units_remaining;
        if (b.units_remaining > 0 && b.expiry_date) {
          if (!cur.soonest || b.expiry_date < cur.soonest) cur.soonest = b.expiry_date;
        }
      }
      map.set(b.item_id, cur);
    });
    return map;
  }, [batches]);

  const receive = useMutation({
    mutationFn: async () => {
      const units = Number(recvForm.units_received) || 0;
      const tpu = Number(recvForm.tests_per_unit) || 0;
      if (units <= 0) throw new Error("Units received must be at least 1");
      const { error } = await db.from("lab_store_batches").insert({
        item_id: recvItem.id,
        batch_number: recvForm.batch_number || null,
        manufacturing_date: recvForm.manufacturing_date || null,
        expiry_date: recvForm.expiry_date || null,
        units_received: units,
        units_remaining: units,
        tests_per_unit: tpu || 1,
        received_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-store-batches"] });
      toast.success("Stock received into store");
      setRecvDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openReceive = (item: any) => {
    setRecvItem(item);
    setRecvForm({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: item.default_tests_per_unit || 1 });
    setRecvDialog(true);
  };

  // Top-level "Add Stock" — opens the receive dialog with an item picker (first item preselected).
  const openAddStock = () => {
    const first = (items ?? [])[0] ?? null;
    setRecvItem(first);
    setRecvForm({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: first?.default_tests_per_unit || 1 });
    setRecvDialog(true);
  };

  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Store Lab Stock (bulk, by units)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Receive bulk lab supplies into the store, batch-wise. When you provide a lab request, units are dispatched (soonest-expiry first) and the lab receives them into its own stock.
            </p>
          </div>
          <Button size="sm" disabled={(items ?? []).length === 0} onClick={openAddStock}>
            <Plus className="w-4 h-4 mr-1" /> Add Stock
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Units On Hand</TableHead>
              <TableHead>Tests / Unit</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Soonest Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No lab items in the catalog yet — add them in "Lab Inventory Items".</TableCell></TableRow>
            ) : (items ?? []).flatMap((item) => {
              const s = stats.get(item.id) ?? { unitsRemaining: 0, expired: 0, soonest: null, batchCount: 0 };
              const low = s.unitsRemaining <= (item.minimum_stock_level ?? 0);
              const expiringSoon = s.soonest ? (new Date(s.soonest).getTime() - today().getTime()) <= 30 * DAY : false;
              const itemBatches = (batches ?? []).filter((b) => b.item_id === item.id);
              const isOpen = expanded.has(item.id);
              return [
                (
                  <TableRow key={item.id} className={low ? "bg-destructive/5" : ""}>
                    <TableCell>
                      {itemBatches.length > 0 && (
                        <button onClick={() => toggleExpand(item.id)} className="text-muted-foreground">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name}
                      <span className="text-xs text-muted-foreground ml-2">({item.category})</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{s.unitsRemaining}</span>
                      <span className="text-xs text-muted-foreground"> {item.unit || "units"}</span>
                      {s.expired > 0 && <span className="text-xs text-destructive ml-1">(+{s.expired} expired)</span>}
                    </TableCell>
                    <TableCell>{item.default_tests_per_unit ?? "—"}</TableCell>
                    <TableCell>{s.batchCount}</TableCell>
                    <TableCell className={expiringSoon ? "text-amber-600 font-medium" : ""}>{s.soonest || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {low && <Badge variant="destructive" className="text-xs">Low</Badge>}
                        {expiringSoon && <Badge variant="outline" className="text-xs border-amber-500 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />Expiring</Badge>}
                        {!low && !expiringSoon && <Badge variant="outline" className="text-xs">OK</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => openReceive(item)}><PackagePlus className="w-3.5 h-3.5 mr-1" />Receive</Button>
                    </TableCell>
                  </TableRow>
                ),
                ...(isOpen ? itemBatches.map((b) => {
                  const exp = b.expiry_date ? new Date(b.expiry_date) < today() : false;
                  return (
                    <TableRow key={b.id} className="bg-muted/30 text-xs">
                      <TableCell></TableCell>
                      <TableCell className="pl-6 text-muted-foreground">Batch {b.batch_number || "—"}</TableCell>
                      <TableCell>{b.units_remaining}/{b.units_received} {item.unit || "units"}</TableCell>
                      <TableCell>{b.tests_per_unit}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className={exp ? "text-destructive font-medium" : ""}>{b.expiry_date || "—"}{exp && " (expired)"}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  );
                }) : []),
              ];
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Receive into store dialog */}
      <Dialog open={recvDialog} onOpenChange={setRecvDialog}>
        <DialogContent className="z-[9999]">
          <DialogHeader><DialogTitle>Receive into Store — {recvItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item</Label>
              <Select
                value={recvItem?.id ?? ""}
                onValueChange={(v) => {
                  const it = (items ?? []).find((i: any) => i.id === v) ?? null;
                  setRecvItem(it);
                  setRecvForm((f) => ({ ...f, tests_per_unit: it?.default_tests_per_unit || f.tests_per_unit || 1 }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  {(items ?? []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Batch / Lot number</Label><Input value={recvForm.batch_number} onChange={(e) => setRecvForm({ ...recvForm, batch_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Units received</Label>
                <Input type="number" min="1" value={recvForm.units_received} onChange={(e) => setRecvForm({ ...recvForm, units_received: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })} />
                <p className="text-[11px] text-muted-foreground mt-1">e.g. number of bottles/boxes</p>
              </div>
              <div>
                <Label>Tests per unit</Label>
                <Input type="number" min="1" value={recvForm.tests_per_unit} onChange={(e) => setRecvForm({ ...recvForm, tests_per_unit: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })} />
                <p className="text-[11px] text-muted-foreground mt-1">tests the lab gets per unit</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Manufacturing date</Label><Input type="date" value={recvForm.manufacturing_date} onChange={(e) => setRecvForm({ ...recvForm, manufacturing_date: e.target.value })} /></div>
              <div><Label>Expiry date</Label><Input type="date" value={recvForm.expiry_date} onChange={(e) => setRecvForm({ ...recvForm, expiry_date: e.target.value })} /></div>
            </div>
            <div className="text-sm text-muted-foreground">
              Receiving <b>{Number(recvForm.units_received) || 0}</b> {recvItem?.unit || "units"}
              {" "}(≈ {(Number(recvForm.units_received) || 0) * (Number(recvForm.tests_per_unit) || 0)} tests when dispatched to the lab)
            </div>
            <Button className="w-full" disabled={!recvItem || receive.isPending} onClick={() => receive.mutate()}>Receive into store</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
