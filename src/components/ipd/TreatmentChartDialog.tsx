import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Plus, Activity, StickyNote, Droplets, Pill, FlaskConical } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admissionId: string;
  patientName?: string;
  admissionNumber?: string;
}

type EntryType = "vitals" | "doctor_note" | "nursing_note" | "iv_fluid" | "intake_output";

export function TreatmentChartDialog({ open, onOpenChange, admissionId, patientName, admissionNumber }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<EntryType>("vitals");
  const [entries, setEntries] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const canWrite = ["admin", "doctor", "nurse", "ota", "staff", "ipd"].includes(profile?.role as string);
  const isDoctor = profile?.role === "doctor";

  const load = async () => {
    if (!admissionId) return;
    setLoading(true);
    const [{ data: c }, { data: m }, { data: l }] = await Promise.all([
      supabase.from("ipd_treatment_chart").select("*").eq("admission_id", admissionId).order("recorded_at", { ascending: false }),
      supabase.from("ipd_medicine_orders").select("*").eq("admission_id", admissionId).order("created_at", { ascending: false }),
      supabase.from("ipd_lab_orders").select("*").eq("admission_id", admissionId).order("created_at", { ascending: false }),
    ]);
    setEntries(c ?? []);
    setMeds(m ?? []);
    setLabs(l ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) { load(); setForm({}); }
  }, [open, admissionId]);

  const filtered = entries.filter(e => e.entry_type === tab);

  const save = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      if ((tab as string) === "medicine") return;
      const payload: any = {
        admission_id: admissionId,
        entry_type: tab,
        recorded_by: profile?.id,
        notes: form.notes || null,
      };
      if (tab === "vitals") {
        Object.assign(payload, {
          temperature: form.temperature ? Number(form.temperature) : null,
          pulse: form.pulse ? Number(form.pulse) : null,
          bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
          bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
          respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
          oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : null,
        });
      } else if (tab === "iv_fluid") {
        Object.assign(payload, {
          fluid_type: form.fluid_type || null,
          fluid_volume_ml: form.fluid_volume_ml ? Number(form.fluid_volume_ml) : null,
          fluid_rate: form.fluid_rate || null,
        });
      } else if (tab === "intake_output") {
        Object.assign(payload, {
          intake_ml: form.intake_ml ? Number(form.intake_ml) : null,
          output_ml: form.output_ml ? Number(form.output_ml) : null,
        });
      }
      const { error } = await supabase.from("ipd_treatment_chart").insert(payload);
      if (error) throw error;
      toast.success("Saved");
      setForm({});
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveMed = async () => {
    if (!canWrite) return;
    if (!form.medicine_name) { toast.error("Medicine name required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("ipd_medicine_orders").insert({
        admission_id: admissionId,
        medicine_name: form.medicine_name,
        dosage: form.dosage || null,
        frequency: form.frequency || null,
        route: form.route || null,
        quantity: form.quantity ? Number(form.quantity) : 1,
        unit_price: form.unit_price ? Number(form.unit_price) : 0,
        notes: form.notes || null,
        ordered_by: profile?.id,
      });
      if (error) throw error;
      toast.success("Medicine ordered");
      setForm({});
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const updateMedStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "dispensed") { patch.dispensed_by = profile?.id; patch.dispensed_at = new Date().toISOString(); }
    if (status === "received") { patch.received_by = profile?.id; patch.received_at = new Date().toISOString(); }
    if (status === "administered") { patch.administered_by = profile?.id; patch.administered_at = new Date().toISOString(); }
    const { error } = await supabase.from("ipd_medicine_orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const saveLab = async () => {
    if (!canWrite) return;
    if (!form.test_name) { toast.error("Test name required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("ipd_lab_orders").insert({
        admission_id: admissionId,
        test_name: form.test_name,
        test_type_id: form.test_type_id || null,
        charge: form.charge ? Number(form.charge) : 0,
        ordered_by: profile?.id,
      });
      if (error) throw error;
      toast.success("Lab test ordered");
      setForm({});
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>
            Treatment Chart
            {patientName && <span className="ml-2 text-sm text-muted-foreground">— {patientName} ({admissionNumber})</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as EntryType); setForm({}); }}>
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="vitals" className="gap-1.5"><Activity className="w-4 h-4" />Vitals</TabsTrigger>
            <TabsTrigger value="doctor_note" className="gap-1.5"><StickyNote className="w-4 h-4" />Doctor Notes</TabsTrigger>
            <TabsTrigger value="nursing_note" className="gap-1.5"><StickyNote className="w-4 h-4" />Nursing</TabsTrigger>
            <TabsTrigger value="iv_fluid" className="gap-1.5"><Droplets className="w-4 h-4" />IV Fluids</TabsTrigger>
            <TabsTrigger value="intake_output" className="gap-1.5"><Droplets className="w-4 h-4" />I / O</TabsTrigger>
            <TabsTrigger value={"medicine" as any} className="gap-1.5"><Pill className="w-4 h-4" />Medicine</TabsTrigger>
            <TabsTrigger value={"lab" as any} className="gap-1.5"><FlaskConical className="w-4 h-4" />Lab</TabsTrigger>
          </TabsList>

          {/* Vitals */}
          <TabsContent value="vitals" className="space-y-4 mt-4">
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md">
                <div><Label>Temp (°C)</Label><Input type="number" step="0.1" value={form.temperature ?? ""} onChange={e => setForm({ ...form, temperature: e.target.value })} /></div>
                <div><Label>Pulse</Label><Input type="number" value={form.pulse ?? ""} onChange={e => setForm({ ...form, pulse: e.target.value })} /></div>
                <div><Label>Resp Rate</Label><Input type="number" value={form.respiratory_rate ?? ""} onChange={e => setForm({ ...form, respiratory_rate: e.target.value })} /></div>
                <div><Label>BP Systolic</Label><Input type="number" value={form.bp_systolic ?? ""} onChange={e => setForm({ ...form, bp_systolic: e.target.value })} /></div>
                <div><Label>BP Diastolic</Label><Input type="number" value={form.bp_diastolic ?? ""} onChange={e => setForm({ ...form, bp_diastolic: e.target.value })} /></div>
                <div><Label>SpO₂ (%)</Label><Input type="number" step="0.1" value={form.oxygen_saturation ?? ""} onChange={e => setForm({ ...form, oxygen_saturation: e.target.value })} /></div>
                <div className="col-span-full"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-full"><Button onClick={save} disabled={saving} size="sm"><Plus className="w-4 h-4 mr-1" />Add Vitals</Button></div>
              </div>
            )}
            <EntriesTable rows={filtered} loading={loading} columns={[
              { h: "Time", c: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
              { h: "Temp", c: (r) => r.temperature ?? "—" },
              { h: "Pulse", c: (r) => r.pulse ?? "—" },
              { h: "BP", c: (r) => r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic}` : "—" },
              { h: "RR", c: (r) => r.respiratory_rate ?? "—" },
              { h: "SpO₂", c: (r) => r.oxygen_saturation ?? "—" },
              { h: "Notes", c: (r) => r.notes ?? "—" },
            ]} />
          </TabsContent>

          {/* Doctor Notes — only doctors can write */}
          <TabsContent value="doctor_note" className="space-y-4 mt-4">
            {(isDoctor || profile?.role === "admin") && (
              <div className="space-y-2 p-4 border rounded-md">
                <Label>Doctor Note</Label>
                <Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={save} disabled={saving || !form.notes} size="sm"><Plus className="w-4 h-4 mr-1" />Add Note</Button>
              </div>
            )}
            {!isDoctor && profile?.role !== "admin" && (
              <div className="text-xs text-muted-foreground mb-2">Doctor notes are read-only. Only doctors can add notes.</div>
            )}
            <EntriesTable rows={filtered} loading={loading} columns={[
              { h: "Time", c: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
              { h: "Note", c: (r) => <span className="whitespace-pre-wrap">{r.notes}</span> },
            ]} />
          </TabsContent>

          {/* Nursing Notes — writable */}
          <TabsContent value="nursing_note" className="space-y-4 mt-4">
            {canWrite && (
              <div className="space-y-2 p-4 border rounded-md">
                <Label>Nursing Note</Label>
                <Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={save} disabled={saving || !form.notes} size="sm"><Plus className="w-4 h-4 mr-1" />Add Note</Button>
              </div>
            )}
            <EntriesTable rows={filtered} loading={loading} columns={[
              { h: "Time", c: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
              { h: "Note", c: (r) => <span className="whitespace-pre-wrap">{r.notes}</span> },
            ]} />
          </TabsContent>

          {/* IV Fluid */}
          <TabsContent value="iv_fluid" className="space-y-4 mt-4">
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md">
                <div><Label>Fluid Type</Label><Input value={form.fluid_type ?? ""} onChange={e => setForm({ ...form, fluid_type: e.target.value })} placeholder="e.g. Normal Saline" /></div>
                <div><Label>Volume (ml)</Label><Input type="number" value={form.fluid_volume_ml ?? ""} onChange={e => setForm({ ...form, fluid_volume_ml: e.target.value })} /></div>
                <div><Label>Rate</Label><Input value={form.fluid_rate ?? ""} onChange={e => setForm({ ...form, fluid_rate: e.target.value })} placeholder="e.g. 100ml/hr" /></div>
                <div className="col-span-full"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-full"><Button onClick={save} disabled={saving} size="sm"><Plus className="w-4 h-4 mr-1" />Add IV</Button></div>
              </div>
            )}
            <EntriesTable rows={filtered} loading={loading} columns={[
              { h: "Time", c: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
              { h: "Fluid", c: (r) => r.fluid_type ?? "—" },
              { h: "Volume", c: (r) => r.fluid_volume_ml ? `${r.fluid_volume_ml} ml` : "—" },
              { h: "Rate", c: (r) => r.fluid_rate ?? "—" },
              { h: "Notes", c: (r) => r.notes ?? "—" },
            ]} />
          </TabsContent>

          {/* I/O */}
          <TabsContent value="intake_output" className="space-y-4 mt-4">
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md">
                <div><Label>Intake (ml)</Label><Input type="number" value={form.intake_ml ?? ""} onChange={e => setForm({ ...form, intake_ml: e.target.value })} /></div>
                <div><Label>Output (ml)</Label><Input type="number" value={form.output_ml ?? ""} onChange={e => setForm({ ...form, output_ml: e.target.value })} /></div>
                <div className="col-span-full"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-full"><Button onClick={save} disabled={saving} size="sm"><Plus className="w-4 h-4 mr-1" />Add I/O</Button></div>
              </div>
            )}
            <EntriesTable rows={filtered} loading={loading} columns={[
              { h: "Time", c: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
              { h: "Intake", c: (r) => r.intake_ml ? `${r.intake_ml} ml` : "—" },
              { h: "Output", c: (r) => r.output_ml ? `${r.output_ml} ml` : "—" },
              { h: "Notes", c: (r) => r.notes ?? "—" },
            ]} />
          </TabsContent>

          {/* Medicine orders */}
          <TabsContent value={"medicine" as any} className="space-y-4 mt-4">
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md">
                <div className="md:col-span-2">
                  <Label>Medicine</Label>
                  <MedicinePicker
                    value={form.medicine_name ?? ""}
                    onSelect={(m) => setForm({ ...form, medicine_name: m.name, unit_price: String(m.selling_price ?? 0) })}
                  />
                </div>
                <div><Label>Dosage</Label><Input value={form.dosage ?? ""} onChange={e => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" /></div>
                <div><Label>Frequency</Label><Input value={form.frequency ?? ""} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. BD / TDS" /></div>
                <div>
                  <Label>Route</Label>
                  <Select value={form.route ?? ""} onValueChange={(v) => setForm({ ...form, route: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="PO">Oral (PO)</SelectItem>
                      <SelectItem value="IV">Intravenous (IV)</SelectItem>
                      <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                      <SelectItem value="SC">Subcutaneous (SC)</SelectItem>
                      <SelectItem value="Topical">Topical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity ?? ""} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit Price (PKR)</Label><Input type="number" value={form.unit_price ?? ""} onChange={e => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div className="col-span-full"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-full"><Button onClick={saveMed} disabled={saving} size="sm"><Plus className="w-4 h-4 mr-1" />Order Medicine</Button></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Dose / Freq / Route</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Pr.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meds.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">No medicine orders</TableCell></TableRow>
                  ) : meds.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="font-medium">{m.medicine_name}</TableCell>
                      <TableCell className="text-xs">{[m.dosage, m.frequency, m.route].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell className="text-xs">PKR {Number(m.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium">PKR {(m.quantity * m.unit_price).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
                      <TableCell className="space-x-1">
                        {m.status === "pending" && <Button size="sm" variant="outline" onClick={() => updateMedStatus(m.id, "dispensed")}>Dispense</Button>}
                        {m.status === "dispensed" && <Button size="sm" variant="outline" onClick={() => updateMedStatus(m.id, "received")}>Mark Received</Button>}
                        {m.status === "received" && <Button size="sm" variant="outline" onClick={() => updateMedStatus(m.id, "administered")}>Administer</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Lab orders */}
          <TabsContent value={"lab" as any} className="space-y-4 mt-4">
            {canWrite && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-md">
                <div className="md:col-span-2">
                  <Label>Test Name</Label>
                  <LabTestPicker
                    value={form.test_name ?? ""}
                    onSelect={(t) => setForm({ ...form, test_name: t.name, test_type_id: t.id, charge: String(t.price ?? 0) })}
                  />
                </div>
                <div><Label>Charge (PKR)</Label><Input type="number" value={form.charge ?? ""} onChange={e => setForm({ ...form, charge: e.target.value })} /></div>
                <div className="md:col-span-3"><Button onClick={saveLab} disabled={saving} size="sm"><Plus className="w-4 h-4 mr-1" />Order Test</Button></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No lab orders</TableCell></TableRow>
                  ) : labs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{format(new Date(l.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="font-medium">{l.test_name}</TableCell>
                      <TableCell>PKR {Number(l.charge ?? 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                      <TableCell className="text-xs whitespace-pre-wrap">{l.result_notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EntriesTable({ rows, loading, columns }: { rows: any[]; loading: boolean; columns: { h: string; c: (r: any) => any }[] }) {
  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-6">No entries yet.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>{columns.map(c => <TableHead key={c.h}>{c.h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {columns.map(c => <TableCell key={c.h} className="text-sm">{c.c(r)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MedicinePicker({ value, onSelect }: { value: string; onSelect: (m: { id: string; name: string; selling_price: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      let q = supabase.from("medicines").select("id,name,selling_price,stock_quantity").order("name").limit(50);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data } = await q;
      setItems(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [open, search]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value || "Search medicine..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10000]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search pharmacy..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup>
              {items.map((m) => (
                <CommandItem key={m.id} value={m.id} onSelect={() => { onSelect(m); setOpen(false); setSearch(""); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === m.name ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">PKR {Number(m.selling_price).toLocaleString()} • Stock: {m.stock_quantity}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LabTestPicker({ value, onSelect }: { value: string; onSelect: (t: { id: string; name: string; price: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      let q = supabase.from("lab_tests").select("id,name,price,category").order("name").limit(50);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data } = await q;
      setItems(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [open, search]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value || "Search lab tests..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10000]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search lab tests..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No test found.</CommandEmpty>
            <CommandGroup>
              {items.map((t) => (
                <CommandItem key={t.id} value={t.id} onSelect={() => { onSelect(t); setOpen(false); setSearch(""); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === t.name ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">PKR {Number(t.price ?? 0).toLocaleString()}{t.category ? ` • ${t.category}` : ""}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
