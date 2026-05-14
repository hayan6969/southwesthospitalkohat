import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Bed = {
  id: string;
  ward_id: string;
  bed_number: string;
  daily_charge: number;
  status: string;
  notes: string | null;
};
type Ward = { id: string; name: string };

const STATUSES = ["available", "occupied", "maintenance", "reserved"];
const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  occupied: "bg-rose-100 text-rose-700",
  maintenance: "bg-amber-100 text-amber-700",
  reserved: "bg-sky-100 text-sky-700",
};

export function BedManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [filterWard, setFilterWard] = useState<string>("all");
  const [form, setForm] = useState({ ward_id: "", bed_number: "", daily_charge: "0", status: "available", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: wards = [] } = useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wards").select("id,name").order("name");
      if (error) throw error;
      return data as Ward[];
    },
  });

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ["beds", filterWard],
    queryFn: async () => {
      let q = supabase.from("beds").select("*").order("bed_number");
      if (filterWard !== "all") q = q.eq("ward_id", filterWard);
      const { data, error } = await q;
      if (error) throw error;
      return data as Bed[];
    },
  });

  const wardName = (id: string) => wards.find((w) => w.id === id)?.name ?? "—";

  const reset = () => {
    setEditing(null);
    setForm({ ward_id: wards[0]?.id ?? "", bed_number: "", daily_charge: "0", status: "available", notes: "" });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (b: Bed) => {
    setEditing(b);
    setForm({
      ward_id: b.ward_id,
      bed_number: b.bed_number,
      daily_charge: String(b.daily_charge),
      status: b.status,
      notes: b.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.ward_id) { toast({ title: "Select a ward", variant: "destructive" }); return; }
    if (!form.bed_number.trim()) { toast({ title: "Bed number required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        ward_id: form.ward_id,
        bed_number: form.bed_number.trim(),
        daily_charge: Number(form.daily_charge) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      const { error } = editing
        ? await supabase.from("beds").update(payload).eq("id", editing.id)
        : await supabase.from("beds").insert(payload);
      if (error) throw error;
      toast({ title: editing ? "Bed updated" : "Bed created" });
      qc.invalidateQueries({ queryKey: ["beds"] });
      qc.invalidateQueries({ queryKey: ["beds-overview"] });
      setOpen(false);
      reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this bed?")) return;
    const { error } = await supabase.from("beds").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bed deleted" });
    qc.invalidateQueries({ queryKey: ["beds"] });
    qc.invalidateQueries({ queryKey: ["beds-overview"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle>Beds</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterWard} onValueChange={setFilterWard}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All wards</SelectItem>
              {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate} disabled={wards.length === 0}>
                <Plus className="w-4 h-4 mr-1" />New Bed
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
              <DialogHeader><DialogTitle>{editing ? "Edit Bed" : "New Bed"}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Ward</Label>
                  <Select value={form.ward_id} onValueChange={(v) => setForm({ ...form, ward_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bed Number</Label>
                  <Input value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} placeholder="e.g. B-01" />
                </div>
                <div>
                  <Label>Daily Charge (PKR)</Label>
                  <Input
                    type="number"
                    value={form.daily_charge}
                    onFocus={(e) => { if (e.target.value === "0") setForm({ ...form, daily_charge: "" }); }}
                    onChange={(e) => setForm({ ...form, daily_charge: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : beds.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {wards.length === 0 ? "Create a ward first." : "No beds in this ward yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bed #</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Daily Charge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beds.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.bed_number}</TableCell>
                    <TableCell>{wardName(b.ward_id)}</TableCell>
                    <TableCell>PKR {Number(b.daily_charge).toLocaleString()}</TableCell>
                    <TableCell><span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLOR[b.status] ?? "bg-muted"}`}>{b.status}</span></TableCell>
                    <TableCell className="max-w-xs truncate">{b.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { STATUS_COLOR };
