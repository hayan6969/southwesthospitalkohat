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

type Ward = {
  id: string;
  name: string;
  ward_type: string;
  floor: string | null;
  description: string | null;
  is_active: boolean;
};

const WARD_TYPES = ["general", "private", "semi_private", "icu", "hdu", "isolation", "pediatric", "maternity"];

export function WardManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ward | null>(null);
  const [form, setForm] = useState({ name: "", ward_type: "general", floor: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { data: wards = [], isLoading } = useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wards").select("*").order("name");
      if (error) throw error;
      return data as Ward[];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ name: "", ward_type: "general", floor: "", description: "" });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (w: Ward) => {
    setEditing(w);
    setForm({ name: w.name, ward_type: w.ward_type, floor: w.floor ?? "", description: w.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ward_type: form.ward_type,
        floor: form.floor.trim() || null,
        description: form.description.trim() || null,
      };
      const { error } = editing
        ? await supabase.from("wards").update(payload).eq("id", editing.id)
        : await supabase.from("wards").insert(payload);
      if (error) throw error;
      toast({ title: editing ? "Ward updated" : "Ward created" });
      qc.invalidateQueries({ queryKey: ["wards"] });
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
    if (!confirm("Delete this ward and all its beds?")) return;
    const { error } = await supabase.from("wards").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ward deleted" });
    qc.invalidateQueries({ queryKey: ["wards"] });
    qc.invalidateQueries({ queryKey: ["beds-overview"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Wards</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New Ward</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
            <DialogHeader><DialogTitle>{editing ? "Edit Ward" : "New Ward"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Male General Ward" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.ward_type} onValueChange={(v) => setForm({ ...form, ward_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {WARD_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ").toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Floor</Label>
                <Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="e.g. Ground / 1st" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : wards.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No wards yet. Create one to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wards.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell><Badge variant="secondary">{(w.ward_type ?? "general").replace("_", " ")}</Badge></TableCell>
                    <TableCell>{w.floor ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{w.description ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
