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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, PackagePlus, ShoppingCart, ChevronDown, ChevronRight, Trash2, AlertTriangle, Pencil, PackageCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { LabItemSupply } from "@/components/inventory/LabItemSupply";
import { LabInventoryManager } from "@/components/inventory/LabInventoryManager";

// The new lab-stock tables aren't in the generated Supabase types yet, so use a
// loosely-typed handle for them (the typed `supabase` is still used elsewhere).
const db = supabase as any;

const DAY = 86400000;
const today = () => new Date(new Date().toDateString());

interface Batch {
  id: string;
  item_id: string;
  batch_number: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  units_received: number;
  tests_per_unit: number;
  tests_total: number;
  tests_remaining: number;
  is_active: boolean;
  created_at: string;
}

export function LabStockManager() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [sub, setSub] = useState("stock");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // dialogs
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: "", category: "kit", unit: "kit", track_by_tests: true, default_tests_per_unit: 100, minimum_tests_level: 20 });

  const [recvDialog, setRecvDialog] = useState(false);
  const [recvItem, setRecvItem] = useState<any>(null);
  const [recvRequest, setRecvRequest] = useState<any>(null); // the dispatched order being received, if any
  const [recvForm, setRecvForm] = useState({ batch_number: "", manufacturing_date: "", expiry_date: "", units_received: 1, tests_per_unit: 100 });

  const [orderDialog, setOrderDialog] = useState(false);
  const [orderItem, setOrderItem] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ quantity: 1, reason: "" });

  // Instrument → tests usage editor
  const [usageDialog, setUsageDialog] = useState(false);
  const [usageItem, setUsageItem] = useState<any>(null);
  const [usageRows, setUsageRows] = useState<Record<string, { checked: boolean; perRun: number | string }>>({});
  const [usageSearch, setUsageSearch] = useState("");

  const { data: items } = useQuery({
    queryKey: ["lab-stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_inventory_items").select("*").order("name");
      if (error) throw error;
      return data as any[];
    },
    // Always show current stock — deductions happen elsewhere (report finalize).
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: batches } = useQuery({
    queryKey: ["lab-stock-batches"],
    queryFn: async () => {
      const { data, error } = await db.from("lab_stock_batches").select("*").eq("is_active", true).order("expiry_date", { nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Batch[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Lab orders the store has dispatched (status "provided") — the lab receives these into batch stock.
  const { data: dispatched } = useQuery({
    queryKey: ["lab-dispatched-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*")
        .eq("item_type", "lab")
        .eq("status", "provided")
        .order("provided_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // A dispatched order is "received" once a batch links back to it (lab_stock_batches.request_id).
  const receivedReqIds = useMemo(
    () => new Set((batches ?? []).map((b: any) => b.request_id).filter(Boolean)),
    [batches]
  );
  const awaitingReceipt = useMemo(
    () => (dispatched ?? []).filter((r) => !receivedReqIds.has(r.id)),
    [dispatched, receivedReqIds]
  );

  const { data: testTypes } = useQuery({
    queryKey: ["lab-test-types-for-kits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_types").select("id, name, report_category, is_active").eq("is_active", true).order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: consumables } = useQuery({
    queryKey: ["lab-test-consumables"],
    queryFn: async () => {
      const { data, error } = await db.from("lab_test_consumables").select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // batch aggregation per item
  const stats = useMemo(() => {
    const map = new Map<string, { testsRemaining: number; expired: number; soonest: string | null; batchCount: number }>();
    (batches ?? []).forEach((b) => {
      const cur = map.get(b.item_id) ?? { testsRemaining: 0, expired: 0, soonest: null, batchCount: 0 };
      const isExpired = b.expiry_date ? new Date(b.expiry_date) < today() : false;
      cur.batchCount += 1;
      if (isExpired) {
        cur.expired += b.tests_remaining;
      } else {
        cur.testsRemaining += b.tests_remaining;
        if (b.tests_remaining > 0 && b.expiry_date) {
          if (!cur.soonest || b.expiry_date < cur.soonest) cur.soonest = b.expiry_date;
        }
      }
      map.set(b.item_id, cur);
    });
    return map;
  }, [batches]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lab-stock-items"] });
    qc.invalidateQueries({ queryKey: ["lab-stock-batches"] });
    qc.invalidateQueries({ queryKey: ["lab-inventory-items"] });
    qc.invalidateQueries({ queryKey: ["lab-dispatched-requests"] });
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category || "kit",
        unit: itemForm.unit || "kit",
        track_by_tests: itemForm.track_by_tests,
        default_tests_per_unit: itemForm.default_tests_per_unit || null,
        minimum_tests_level: itemForm.minimum_tests_level || 0,
      };
      if (editingItem) {
        const { error } = await supabase.from("lab_inventory_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lab_inventory_items").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success(editingItem ? "Item updated" : "Item added"); setItemDialog(false); setEditingItem(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const receive = useMutation({
    mutationFn: async () => {
      const units = Number(recvForm.units_received) || 0;
      const tpu = Number(recvForm.tests_per_unit) || 0;
      const total = units * tpu;
      const { error } = await db.from("lab_stock_batches").insert({
        item_id: recvItem.id,
        batch_number: recvForm.batch_number || null,
        manufacturing_date: recvForm.manufacturing_date || null,
        expiry_date: recvForm.expiry_date || null,
        units_received: units,
        tests_per_unit: tpu,
        tests_total: total,
        tests_remaining: total,
        received_by: user?.id ?? null,
        request_id: recvRequest?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success(recvRequest ? "Order received into stock" : "Stock received"); setRecvDialog(false); setRecvRequest(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const order = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_requests").insert({
        requested_by: user?.id ?? null,
        item_name: orderItem.name,
        item_type: "lab",
        quantity: Number(orderForm.quantity) || 1,
        reason: orderForm.reason || null,
        status: "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Order sent to manager/store"); setOrderDialog(false); setOrderForm({ quantity: 1, reason: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Save which tests use the current instrument (and how many tests one run consumes).
  const saveUsage = useMutation({
    mutationFn: async () => {
      const item = usageItem;
      const entries = Object.entries(usageRows);
      const unchecked = entries.filter(([, v]) => !v.checked).map(([tid]) => tid);
      const checked = entries.filter(([, v]) => v.checked);
      if (unchecked.length) {
        const { error } = await db.from("lab_test_consumables").delete().eq("item_id", item.id).in("test_type_id", unchecked);
        if (error) throw error;
      }
      if (checked.length) {
        const rows = checked.map(([tid, v]) => ({
          test_type_id: tid, item_id: item.id, tests_per_run: Number(v.perRun) || 1, is_default: true,
        }));
        const { error } = await db.from("lab_test_consumables").upsert(rows, { onConflict: "test_type_id,item_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-test-consumables"] }); toast.success("Usage saved"); setUsageDialog(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const openUsage = (item: any) => {
    const map: Record<string, { checked: boolean; perRun: number }> = {};
    (testTypes ?? []).forEach((t) => {
      const c = (consumables ?? []).find((x: any) => x.test_type_id === t.id && x.item_id === item.id);
      map[t.id] = { checked: !!c, perRun: c?.tests_per_run ?? 1 };
    });
    setUsageItem(item);
    setUsageRows(map);
    setUsageSearch("");
    setUsageDialog(true);
  };

  // Receive a specific dispatched order: match it to its stock item by name, pre-fill the ordered qty.
  const openReceiveFromRequest = (req: any) => {
    const item = (items ?? []).find((i) => String(i.name).toLowerCase() === String(req.item_name).toLowerCase());
    if (!item) {
      toast.error(`Add "${req.item_name}" as an item in Stock & Batches first, then receive it.`);
      return;
    }
    setRecvRequest(req);
    setRecvItem(item);
    setRecvForm({
      batch_number: "", manufacturing_date: "", expiry_date: "",
      units_received: Number(req.quantity) || 1,
      tests_per_unit: item.default_tests_per_unit || 100,
    });
    setRecvDialog(true);
  };
  const openOrder = (item: any) => { setOrderItem(item); setOrderForm({ quantity: 1, reason: "" }); setOrderDialog(true); };
  const openAddItem = () => { setEditingItem(null); setItemForm({ name: "", category: "kit", unit: "kit", track_by_tests: true, default_tests_per_unit: 100, minimum_tests_level: 20 }); setItemDialog(true); };
  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({ name: item.name, category: item.category || "kit", unit: item.unit || "kit", track_by_tests: item.track_by_tests ?? true, default_tests_per_unit: item.default_tests_per_unit || 0, minimum_tests_level: item.minimum_tests_level || 0 });
    setItemDialog(true);
  };

  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-4">
      <TabsList>
        <TabsTrigger value="stock">Stock &amp; Batches</TabsTrigger>
        <TabsTrigger value="usage">Instrument Usage</TabsTrigger>
        <TabsTrigger value="catalog">Lab Items</TabsTrigger>
        <TabsTrigger value="requests">Request from Store</TabsTrigger>
      </TabsList>

      {/* ── STOCK ─────────────────────────────────────────────────────────── */}
      <TabsContent value="stock">
       <div className="space-y-4">
        {awaitingReceipt.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-amber-600" />
                Dispatched from store — awaiting receipt ({awaitingReceipt.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                The store dispatched these orders. Check the delivery, then receive each into batch stock (enter batch / expiry / tests per unit). Receiving links the batch to the order.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty ordered</TableHead>
                    <TableHead>Dispatched</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingReceipt.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.item_name}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.provided_at ? new Date(r.provided_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openReceiveFromRequest(r)}><PackageCheck className="w-3.5 h-3.5 mr-1" />Receive</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lab Stock</CardTitle>
            <Button size="sm" onClick={openAddItem}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tests Left</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Soonest Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No lab items yet</TableCell></TableRow>
                ) : (items ?? []).flatMap((item) => {
                  const s = stats.get(item.id) ?? { testsRemaining: 0, expired: 0, soonest: null, batchCount: 0 };
                  // Lab stock is the batch ledger (tests). stock_quantity is the store's flat
                  // field and is NOT used for lab on-hand anymore.
                  const low = s.testsRemaining <= (item.minimum_tests_level || 0);
                  const expiringSoon = s.soonest ? (new Date(s.soonest).getTime() - today().getTime()) <= 30 * DAY : false;
                  const itemBatches = (batches ?? []).filter((b) => b.item_id === item.id);
                  const isOpen = expanded.has(item.id);
                  // Receive is only allowed against a store-dispatched ("provided") order for this item.
                  const pendingOrder = awaitingReceipt.find((r) => String(r.item_name).toLowerCase() === String(item.name).toLowerCase());
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
                          <span className="font-semibold">{s.testsRemaining}</span>
                          <span className="text-xs text-muted-foreground"> tests</span>
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
                          <Button
                            variant={pendingOrder ? "default" : "outline"}
                            size="sm"
                            className="mr-1"
                            disabled={!pendingOrder}
                            title={pendingOrder
                              ? `Receive store-dispatched order (qty ${pendingOrder.quantity})`
                              : "Order from store first — Receive unlocks once the store marks it provided"}
                            onClick={() => pendingOrder && openReceiveFromRequest(pendingOrder)}
                          >
                            <PackagePlus className="w-3.5 h-3.5 mr-1" />Receive
                          </Button>
                          <Button variant="outline" size="sm" className="mr-1" onClick={() => openOrder(item)}><ShoppingCart className="w-3.5 h-3.5 mr-1" />Order</Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete ${item.name}?`)) deleteItem.mutate(item.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ),
                    ...(isOpen ? itemBatches.map((b) => {
                      const exp = b.expiry_date ? new Date(b.expiry_date) < today() : false;
                      return (
                        <TableRow key={b.id} className="bg-muted/30 text-xs">
                          <TableCell></TableCell>
                          <TableCell className="pl-6 text-muted-foreground">Batch {b.batch_number || "—"}</TableCell>
                          <TableCell>{b.tests_remaining}/{b.tests_total}</TableCell>
                          <TableCell>{b.units_received} × {b.tests_per_unit}</TableCell>
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
        </Card>
       </div>
      </TabsContent>

      {/* ── INSTRUMENT USAGE ──────────────────────────────────────────────── */}
      <TabsContent value="usage">
        <Card>
          <CardHeader><CardTitle>Instrument Usage</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Each instrument/reagent has a capacity (tests per unit — e.g. a 1000cc bottle performs 5 tests) and a list of tests that consume it. When a report is finalized, the chosen instruments are deducted from stock (earliest-expiry batch first).
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Tests / unit</TableHead>
                  <TableHead>Tests left</TableHead>
                  <TableHead>Used in tests</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No instruments yet — add one in <b>Stock &amp; Batches</b>.</TableCell></TableRow>
                ) : (items ?? []).map((item) => {
                  const s = stats.get(item.id);
                  const used = (consumables ?? []).filter((c) => c.item_id === item.id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.category})</span></TableCell>
                      <TableCell>{item.track_by_tests ? <span><b>{item.default_tests_per_unit ?? "—"}</b> tests</span> : "—"}</TableCell>
                      <TableCell>{s?.testsRemaining ?? 0}</TableCell>
                      <TableCell className="max-w-[320px]">
                        {used.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Not assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {used.map((c) => {
                              const tname = (testTypes ?? []).find((t) => t.id === c.test_type_id)?.name ?? "test";
                              return <Badge key={c.id} variant="secondary" className="text-xs">{tname}{(c.tests_per_run ?? 1) > 1 ? ` ×${c.tests_per_run}` : ""}</Badge>;
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openUsage(item)}>Edit usage</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── LAB ITEMS (catalog) ───────────────────────────────────────────── */}
      <TabsContent value="catalog">
        <LabInventoryManager />
      </TabsContent>

      {/* ── REQUEST FROM STORE ────────────────────────────────────────────── */}
      <TabsContent value="requests">
        <LabItemSupply />
      </TabsContent>

      {/* ── Add/Edit Item dialog ──────────────────────────────────────────── */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="z-[9999]">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Lab Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. CBC Reagent Kit" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} placeholder="kit, reagent, consumable" /></div>
              <div><Label>Unit</Label><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="kit, box, pack" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={itemForm.track_by_tests} onCheckedChange={(v) => setItemForm({ ...itemForm, track_by_tests: !!v })} />
              Track by number of tests (e.g. one bottle/kit performs several tests)
            </label>
            {itemForm.track_by_tests && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tests per unit</Label>
                  <Input type="number" min="1" value={itemForm.default_tests_per_unit} onChange={(e) => setItemForm({ ...itemForm, default_tests_per_unit: parseInt(e.target.value) || 0 })} />
                  <p className="text-[11px] text-muted-foreground mt-1">e.g. a 1000cc bottle performs 5 tests → enter 5</p>
                </div>
                <div><Label>Low-stock at (tests)</Label><Input type="number" min="0" value={itemForm.minimum_tests_level} onChange={(e) => setItemForm({ ...itemForm, minimum_tests_level: parseInt(e.target.value) || 0 })} /></div>
              </div>
            )}
            <Button className="w-full" disabled={!itemForm.name.trim() || saveItem.isPending} onClick={() => saveItem.mutate()}>{editingItem ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receive dialog ────────────────────────────────────────────────── */}
      <Dialog open={recvDialog} onOpenChange={(o) => { setRecvDialog(o); if (!o) setRecvRequest(null); }}>
        <DialogContent className="z-[9999]">
          <DialogHeader><DialogTitle>Receive Stock — {recvItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {recvRequest && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Receiving against store dispatch — <b>{recvRequest.quantity}</b> {recvRequest.item_name} ordered.
              </div>
            )}
            <div><Label>Batch / Lot number</Label><Input value={recvForm.batch_number} onChange={(e) => setRecvForm({ ...recvForm, batch_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Units received</Label><Input type="number" min="1" value={recvForm.units_received} onChange={(e) => setRecvForm({ ...recvForm, units_received: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Tests per kit</Label><Input type="number" min="1" value={recvForm.tests_per_unit} onChange={(e) => setRecvForm({ ...recvForm, tests_per_unit: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Manufacturing date</Label><Input type="date" value={recvForm.manufacturing_date} onChange={(e) => setRecvForm({ ...recvForm, manufacturing_date: e.target.value })} /></div>
              <div><Label>Expiry date</Label><Input type="date" value={recvForm.expiry_date} onChange={(e) => setRecvForm({ ...recvForm, expiry_date: e.target.value })} /></div>
            </div>
            <div className="text-sm text-muted-foreground">Total capacity: <b>{(Number(recvForm.units_received) || 0) * (Number(recvForm.tests_per_unit) || 0)}</b> tests</div>
            <Button className="w-full" disabled={receive.isPending} onClick={() => receive.mutate()}>Receive into stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order dialog ──────────────────────────────────────────────────── */}
      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent className="z-[9999]">
          <DialogHeader><DialogTitle>Order — {orderItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sends a supply request to the manager/store (they approve &amp; provide).</p>
            <div><Label>Quantity</Label><Input type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Reason / note</Label><Input value={orderForm.reason} onChange={(e) => setOrderForm({ ...orderForm, reason: e.target.value })} placeholder="e.g. running low" /></div>
            <Button className="w-full" disabled={order.isPending} onClick={() => order.mutate()}>Send order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Instrument usage dialog ───────────────────────────────────────── */}
      <Dialog open={usageDialog} onOpenChange={setUsageDialog}>
        <DialogContent className="z-[9999] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tests using — {usageItem?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tick each test that consumes this instrument, and how many tests one run uses (usually 1). These become the defaults pre-filled on the report.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={usageSearch}
              onChange={(e) => setUsageSearch(e.target.value)}
              placeholder="Search tests…"
              className="pl-8"
            />
          </div>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {(() => {
              const q = usageSearch.trim().toLowerCase();
              const filtered = (testTypes ?? []).filter((t) =>
                !q || `${t.name} ${t.report_category ?? ""}`.toLowerCase().includes(q)
              );
              if ((testTypes ?? []).length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No active tests found.</p>;
              if (filtered.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No tests match “{usageSearch}”.</p>;
              return filtered.map((t) => {
              const row = usageRows[t.id] ?? { checked: false, perRun: 1 };
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b pb-1.5">
                  <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                    <Checkbox checked={row.checked} onCheckedChange={(v) => setUsageRows((m) => ({ ...m, [t.id]: { ...row, checked: !!v } }))} />
                    <span className="truncate">{t.name} <span className="text-xs text-muted-foreground">({t.report_category})</span></span>
                  </label>
                  {row.checked && (
                    <div className="flex items-center gap-1 text-xs shrink-0">
                      <span className="text-muted-foreground">tests/run</span>
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-8"
                        value={row.perRun}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = parseInt(raw, 10);
                          setUsageRows((m) => {
                            const cur = m[t.id] ?? row;
                            return { ...m, [t.id]: { ...cur, perRun: raw === "" || Number.isNaN(n) ? "" : n } };
                          });
                        }}
                        onBlur={() => setUsageRows((m) => {
                          const cur = m[t.id] ?? row;
                          const n = Number(cur.perRun);
                          return { ...m, [t.id]: { ...cur, perRun: n >= 1 ? n : 1 } };
                        })}
                      />
                    </div>
                  )}
                </div>
              );
            });
            })()}
          </div>
          <Button className="w-full" disabled={saveUsage.isPending} onClick={() => saveUsage.mutate()}>Save usage</Button>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
