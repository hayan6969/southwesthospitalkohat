
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export function LabInventoryManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", category: "consumable", description: "", stock_quantity: 0, minimum_stock_level: 10, unit: "pieces" });
  const [nameSearch, setNameSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["lab-inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_inventory_items").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredSuggestions = useMemo(() => {
    if (!nameSearch.trim() || !items) return [];
    const q = nameSearch.toLowerCase();
    return items.filter((i: any) => i.name.toLowerCase().includes(q) && i.name !== form.name).slice(0, 8);
  }, [nameSearch, items, form.name]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await supabase.from("lab_inventory_items").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lab_inventory_items").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-lab"] });
      toast.success(editing ? "Item updated" : "Item added");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-inventory-items"] });
      toast.success("Item deleted");
    },
  });

  const resetForm = () => {
    setForm({ name: "", category: "consumable", description: "", stock_quantity: 0, minimum_stock_level: 10, unit: "pieces" });
    setNameSearch("");
    setEditing(null);
    setOpen(false);
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, category: item.category, description: item.description || "", stock_quantity: item.stock_quantity, minimum_stock_level: item.minimum_stock_level, unit: item.unit });
    setNameSearch(item.name);
    setEditing(item);
    setOpen(true);
  };

  const selectSuggestion = (item: any) => {
    setForm({ ...form, name: item.name, category: item.category, unit: item.unit });
    setNameSearch(item.name);
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lab Inventory Items</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lab Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Lab Item" : "Add Lab Item"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Label>Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={nameSearch}
                    onChange={(e) => {
                      setNameSearch(e.target.value);
                      setForm({ ...form, name: e.target.value });
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search or type item name..."
                  />
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((item: any, idx: number) => (
                      <button
                        key={idx}
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between text-sm"
                        onMouseDown={() => selectSuggestion(item)}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <span className={`text-xs ${item.stock_quantity <= item.minimum_stock_level ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Stock: {item.stock_quantity}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="consumable, reagent, equipment" /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Stock Qty</Label><Input type="number" value={form.stock_quantity === 0 && document.activeElement?.getAttribute('data-field') === 'stock_quantity' ? '' : form.stock_quantity} min="0" data-field="stock_quantity" onChange={(e) => setForm({ ...form, stock_quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} onFocus={(e) => { if (form.stock_quantity === 0) e.target.value = ''; }} onBlur={(e) => { if (e.target.value === '') setForm(f => ({ ...f, stock_quantity: 0 })); }} /></div>
                <div><Label>Min Stock Level</Label><Input type="number" value={form.minimum_stock_level === 0 && document.activeElement?.getAttribute('data-field') === 'min_stock' ? '' : form.minimum_stock_level} min="0" data-field="min_stock" onChange={(e) => setForm({ ...form, minimum_stock_level: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} onFocus={(e) => { if (form.minimum_stock_level === 0) e.target.value = ''; }} onBlur={(e) => { if (e.target.value === '') setForm(f => ({ ...f, minimum_stock_level: 0 })); }} /></div>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
                {editing ? "Update" : "Add"} Lab Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : items?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No lab items yet</TableCell></TableRow>
            ) : items?.map((item: any) => (
              <TableRow key={item.id} className={item.stock_quantity <= item.minimum_stock_level ? "bg-destructive/10" : ""}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.stock_quantity}</TableCell>
                <TableCell>{item.minimum_stock_level}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
