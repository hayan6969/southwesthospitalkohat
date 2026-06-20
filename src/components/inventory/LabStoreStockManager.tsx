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
import { PackagePlus, ChevronDown, ChevronRight, AlertTriangle, Plus, Search } from "lucide-react";
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
  const [recvItem, setRecvItem] = useState<any>(null); // matched existing catalog item (null = will create)
  const [itemName, setItemName] = useState("");        // typed item name (search/create)
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const itemSuggestions = useMemo(() => {
    const q = itemName.trim().toLowerCase();
    if (!q) return [] as any[];
    return (items ?? []).filter((i: any) => String(i.name).toLowerCase().includes(q)).slice(0, 8);
  }, [items, itemName]);
  const hasExactMatch = useMemo(
    () => (items ?? []).some((i: any) => String(i.name).toLowerCase() === itemName.trim().toLowerCase()),
    [items, itemName]
  );

  const receive = useMutation({
    mutationFn: async () => {
      const name = itemName.trim();
      if (!name) throw new Error("Enter or select an item name");
      const units = Number(recvForm.units_received) || 0;
      if (units <= 0) throw new Error("Units received must be at least 1");

      // Resolve the catalog item by exact name (case-insensitive); create it if it doesn't exist.
      // The store does NOT set tests-per-unit — that's a lab detail. New items get tests-per-unit
      // left for the lab to define; the store only handles bulk units.
      let item = (items ?? []).find((i: any) => String(i.name).toLowerCase() === name.toLowerCase());
      let itemId = item?.id;
      if (!itemId) {
        const { data: created, error: ce } = await supabase
          .from("lab_inventory_items")
          .insert({
            name,
            category: "consumable",
            unit: "pieces",
            track_by_tests: true,
            minimum_tests_level: 0,
          } as any)
          .select("*").single();
        if (ce) throw ce;
        item = created;
        itemId = created.id;
      }

      const { error } = await db.from("lab_store_batches").insert({
        item_id: itemId,
        batch_number: recvForm.batch_number || null,
        manufacturing_date: recvForm.manufacturing_date || null,
        expiry_date: recvForm.expiry_date || null,
        units_received: units,
        units_remaining: units,
        // Carry the lab's configured tests-per-unit if known (store never edits it); defaults to 1.
        tests_per_unit: item?.default_tests_per_unit || 1,
        received_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-store-batches"] });
      qc.invalidateQueries({ queryKey: ["lab-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["lab-stock-items"] });
      toast.success("Stock received into store");
      setRecvDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openReceive = (item: any) => {
    setRecvItem(item);
    setItemName(item.name);
    setShowSuggestions(false);
    setRecvForm({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: item.default_tests_per_unit || 1 });
    setRecvDialog(true);
  };

  // Top-level "Add Stock" — opens the receive dialog with a blank, searchable item field
  // (pick an existing item or type a new name to create it).
  const openAddStock = () => {
    setRecvItem(null);
    setItemName("");
    setShowSuggestions(false);
    setRecvForm({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: 1 });
    setRecvDialog(true);
  };

  const selectItem = (item: any) => {
    setRecvItem(item);
    setItemName(item.name);
    setShowSuggestions(false);
    setRecvForm((f) => ({ ...f, tests_per_unit: item.default_tests_per_unit || f.tests_per_unit || 1 }));
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
              <TableHead>Batches</TableHead>
              <TableHead>Soonest Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No lab items yet — use "Add Stock" to receive one.</TableCell></TableRow>
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
          <DialogHeader><DialogTitle>Receive into Store</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Label>Item</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={itemName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItemName(v);
                    const exact = (items ?? []).find((i: any) => String(i.name).toLowerCase() === v.trim().toLowerCase()) ?? null;
                    setRecvItem(exact);
                    if (exact) setRecvForm((f) => ({ ...f, tests_per_unit: exact.default_tests_per_unit || f.tests_per_unit || 1 }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search an item, or type a new name to create it…"
                />
              </div>
              {showSuggestions && itemName.trim() && (itemSuggestions.length > 0 || !hasExactMatch) && (
                <div className="absolute z-[10001] w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {itemSuggestions.map((i: any) => (
                    <button
                      key={i.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between text-sm"
                      onMouseDown={() => selectItem(i)}
                    >
                      <span className="font-medium">{i.name}</span>
                      <Badge variant="outline" className="text-xs">{i.category}</Badge>
                    </button>
                  ))}
                  {!hasExactMatch && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center gap-2 border-t"
                      onMouseDown={() => { setRecvItem(null); setShowSuggestions(false); }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Create new item “{itemName.trim()}”
                    </button>
                  )}
                </div>
              )}
              {!recvItem && itemName.trim() && !hasExactMatch && (
                <p className="text-[11px] text-amber-600 mt-1">New item “{itemName.trim()}” will be created on receive.</p>
              )}
            </div>
            <div><Label>Batch / Lot number</Label><Input value={recvForm.batch_number} onChange={(e) => setRecvForm({ ...recvForm, batch_number: e.target.value })} /></div>
            <div>
              <Label>Units received</Label>
              <Input type="number" min="1" value={recvForm.units_received} onChange={(e) => setRecvForm({ ...recvForm, units_received: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })} />
              <p className="text-[11px] text-muted-foreground mt-1">e.g. number of bottles/boxes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Manufacturing date</Label><Input type="date" value={recvForm.manufacturing_date} onChange={(e) => setRecvForm({ ...recvForm, manufacturing_date: e.target.value })} /></div>
              <div><Label>Expiry date</Label><Input type="date" value={recvForm.expiry_date} onChange={(e) => setRecvForm({ ...recvForm, expiry_date: e.target.value })} /></div>
            </div>
            <div className="text-sm text-muted-foreground">
              Receiving <b>{Number(recvForm.units_received) || 0}</b> {recvItem?.unit || "units"} into store.
            </div>
            <Button className="w-full" disabled={!itemName.trim() || receive.isPending} onClick={() => receive.mutate()}>Receive into store</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
