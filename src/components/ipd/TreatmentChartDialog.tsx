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
import { AnesthesiaNotesDialog } from "@/components/dialogs/AnesthesiaNotesDialog";
import { Loader2, Plus, Activity, StickyNote, Droplets, Pill, FlaskConical, Download, Syringe } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

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
  const [anesthesiaNotes, setAnesthesiaNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showAnesthesiaDialog, setShowAnesthesiaDialog] = useState(false);

  const canWrite = ["admin", "doctor", "nurse", "ota", "staff", "ipd"].includes(profile?.role as string);
  const isDoctor = profile?.role === "doctor";

  const load = async () => {
    if (!admissionId) return;
    setLoading(true);
    
    const { data: adm } = await supabase
      .from("ipd_admissions")
      .select("patient_id")
      .eq("id", admissionId)
      .maybeSingle();
    
    let otIds: string[] = [];
    if (adm?.patient_id) {
      const { data: ots } = await supabase
        .from("ot_schedules")
        .select("id")
        .eq("patient_id", adm.patient_id);
      otIds = (ots ?? []).map(o => o.id);
    }
    
    let anesthesiaQuery = supabase.from("anesthesia_notes").select("*");
    if (otIds.length > 0) {
      anesthesiaQuery = anesthesiaQuery.or(`admission_id.eq.${admissionId},ot_booking_id.in.(${otIds.join(",")})`);
    } else {
      anesthesiaQuery = anesthesiaQuery.eq("admission_id", admissionId);
    }
    anesthesiaQuery = anesthesiaQuery.order("created_at", { ascending: false });
    
    const [{ data: c }, { data: m }, { data: l }, { data: a }] = await Promise.all([
      supabase.from("ipd_treatment_chart").select("*").eq("admission_id", admissionId).order("recorded_at", { ascending: false }),
      supabase.from("ipd_medicine_orders").select("*").eq("admission_id", admissionId).order("created_at", { ascending: false }),
      supabase.from("ipd_lab_orders").select("*").eq("admission_id", admissionId).order("created_at", { ascending: false }),
      anesthesiaQuery,
    ]);
    setEntries(c ?? []);
    setMeds(m ?? []);
    setLabs(l ?? []);
    setAnesthesiaNotes(a ?? []);
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
      if (form.time) {
        const now = new Date();
        const [h, m] = form.time.split(":");
        now.setHours(parseInt(h), parseInt(m), 0, 0);
        payload.recorded_at = now.toISOString();
      }
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

  const downloadFullPdf = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const m = 15;
    let y = m;

    const header = () => {
      pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
      pdf.text("Treatment Chart", pw / 2, y, { align: "center" }); y += 6;
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
      pdf.text(`${patientName || ""} (${admissionNumber || admissionId})`, pw / 2, y, { align: "center" }); y += 5;
      pdf.line(m, y, pw - m, y); y += 5;
    };

    const section = (title: string) => {
      if (y > 272) { pdf.addPage(); y = m; }
      pdf.setFillColor(50, 50, 50); pdf.rect(m, y - 1, pw - 2 * m, 6, "F");
      pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
      pdf.text(title, pw / 2, y + 4, { align: "center" });
      pdf.setTextColor(0); pdf.setFont("helvetica", "normal");
      y += 9;
    };

    const row = (cols: string[], widths: number[]) => {
      if (y > 275) { pdf.addPage(); y = m; header(); }
      let x = m;
      cols.forEach((c, i) => {
        pdf.rect(x, y, widths[i], 5);
        pdf.setFontSize(8); pdf.text(c, x + 1, y + 3.5);
        x += widths[i];
      });
      y += 5;
    };

    header();

    // VITALS
    const vitals = entries.filter(e => e.entry_type === "vitals");
    if (vitals.length > 0) {
      section("VITALS");
      const cw = (pw - 2 * m) / 6;
      const vCols = ["Time", "Temp", "Pulse", "BP", "RR", "SpO₂"];
      pdf.setFillColor(230); row(vCols, Array(6).fill(cw));
      vitals.forEach(v => row([
        format(new Date(v.recorded_at), "MMM d HH:mm"),
        v.temperature ?? "\u2014",
        v.pulse ?? "\u2014",
        v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : "\u2014",
        v.respiratory_rate ?? "\u2014",
        v.oxygen_saturation ?? "\u2014",
      ], Array(6).fill(cw)));
    }

    // IV FLUIDS
    const ivs = entries.filter(e => e.entry_type === "iv_fluid");
    if (ivs.length > 0) {
      section("IV FLUIDS");
      const cw = (pw - 2 * m) / 5;
      const iCols = ["Time", "Fluid", "Volume", "Rate", "Notes"];
      pdf.setFillColor(230); row(iCols, Array(5).fill(cw));
      ivs.forEach(iv => row([
        format(new Date(iv.recorded_at), "MMM d HH:mm"),
        iv.fluid_type ?? "\u2014",
        iv.fluid_volume_ml ? `${iv.fluid_volume_ml} ml` : "\u2014",
        iv.fluid_rate ?? "\u2014",
        iv.notes ?? "\u2014",
      ], Array(5).fill(cw)));
    }

    // INTAKE/OUTPUT
    const ios = entries.filter(e => e.entry_type === "intake_output");
    if (ios.length > 0) {
      section("INTAKE / OUTPUT");
      const cw = (pw - 2 * m) / 4;
      const ioCols = ["Time", "Intake", "Output", "Notes"];
      pdf.setFillColor(230); row(ioCols, Array(4).fill(cw));
      ios.forEach(io => row([
        format(new Date(io.recorded_at), "MMM d HH:mm"),
        io.intake_ml ? `${io.intake_ml} ml` : "\u2014",
        io.output_ml ? `${io.output_ml} ml` : "\u2014",
        io.notes ?? "\u2014",
      ], Array(4).fill(cw)));
    }

    // ANAESTHESIA NOTES
    if (anesthesiaNotes.length > 0) {
      section("ANAESTHESIA NOTES");
      anesthesiaNotes.forEach(note => {
        if (y > 260) { pdf.addPage(); y = m; header(); }
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold");
        const line = (lbl: string, val: string) => {
          if (y > 275) { pdf.addPage(); y = m; header(); }
          pdf.setFont("helvetica", "bold"); pdf.text(lbl + ":", m, y);
          pdf.setFont("helvetica", "normal"); pdf.text(val || "\u2014", m + 40, y);
          y += 5;
        };
        line("Procedure", note.surgical_procedure);
        line("Anesthesia", note.anesthesia_type);
        line("History", note.brief_history);
        line("Pre-Op Vitals", `HR: ${note.preop_hr ?? "\u2014"} BP: ${note.preop_bp || "\u2014"} SpO₂: ${note.preop_spo2 ?? "\u2014"}`);
        line("Pre-Op Med", note.preop_medication);
        line("Drugs Used", note.anesthesia_drugs);
        line("Recovery", note.recovery_status);
        if (note.postop_orders?.items?.length) line("Post-Op Orders", note.postop_orders.items.join(", "));
      });
    }

    pdf.save(`Treatment_Chart_${admissionNumber || admissionId}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Treatment Chart
              {patientName && <span className="ml-2 text-sm text-muted-foreground">— {patientName} ({admissionNumber})</span>}
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={downloadFullPdf} className="gap-1.5">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
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
            <TabsTrigger value={"anesthesia" as any} className="gap-1.5"><Syringe className="w-4 h-4" />Anaesthesia</TabsTrigger>
          </TabsList>

          {/* Vitals */}
          <TabsContent value="vitals" className="space-y-4 mt-4">
            <div className="flex justify-end">
              {filtered.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => downloadPdf(`Vitals_${patientName || admissionId}`, filtered, [
                  { h: "Time", f: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
                  { h: "Temp", f: (r) => r.temperature ?? "—" },
                  { h: "Pulse", f: (r) => r.pulse ?? "—" },
                  { h: "BP", f: (r) => r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic}` : "—" },
                  { h: "RR", f: (r) => r.respiratory_rate ?? "—" },
                  { h: "SpO₂", f: (r) => r.oxygen_saturation ?? "—" },
                ])} className="gap-1"><Download className="w-3 h-3" />PDF</Button>
              )}
            </div>
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-md">
                <div><Label>Time</Label><Input type="time" value={form.time ?? ""} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
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
            <div className="flex justify-end">
              {filtered.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => downloadPdf(`IV_Fluids_${patientName || admissionId}`, filtered, [
                  { h: "Time", f: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
                  { h: "Fluid", f: (r) => r.fluid_type ?? "—" },
                  { h: "Volume", f: (r) => r.fluid_volume_ml ? `${r.fluid_volume_ml} ml` : "—" },
                  { h: "Rate", f: (r) => r.fluid_rate ?? "—" },
                  { h: "Notes", f: (r) => r.notes ?? "—" },
                ])} className="gap-1"><Download className="w-3 h-3" />PDF</Button>
              )}
            </div>
            {canWrite && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-md">
                <div><Label>Time</Label><Input type="time" value={form.time ?? ""} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
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
            <div className="flex justify-end">
              {filtered.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => downloadPdf(`Intake_Output_${patientName || admissionId}`, filtered, [
                  { h: "Time", f: (r) => format(new Date(r.recorded_at), "MMM d HH:mm") },
                  { h: "Intake", f: (r) => r.intake_ml ? `${r.intake_ml} ml` : "—" },
                  { h: "Output", f: (r) => r.output_ml ? `${r.output_ml} ml` : "—" },
                  { h: "Notes", f: (r) => r.notes ?? "—" },
                ])} className="gap-1"><Download className="w-3 h-3" />PDF</Button>
              )}
            </div>
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

          {/* Anaesthesia Notes */}
          <TabsContent value={"anesthesia" as any} className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : anesthesiaNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Syringe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No anaesthesia notes found for this admission.</p>
                <p className="text-xs mt-1">Add anaesthesia notes from the Doctor OT page.</p>
              </div>
            ) : anesthesiaNotes.map((note) => (
              <div key={note.id} className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={note.status === "finalized" ? "default" : "secondary"}>{note.status}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Surgical Procedure:</span><p className="text-muted-foreground">{note.surgical_procedure || "\u2014"}</p></div>
                  <div><span className="font-medium">Anesthesia Type:</span><p className="text-muted-foreground">{note.anesthesia_type || "\u2014"}</p></div>
                </div>
                <div className="text-sm"><span className="font-medium">Brief History:</span><p className="text-muted-foreground whitespace-pre-wrap">{note.brief_history || "\u2014"}</p></div>
                <div className="text-sm">
                  <span className="font-medium">Pre-Op Vitals:</span>
                  <p className="text-muted-foreground">
                    HR: {note.preop_hr ?? "\u2014"} | BP: {note.preop_bp || "\u2014"} | SpO₂: {note.preop_spo2 ?? "\u2014"}%
                  </p>
                </div>
                <div className="text-sm"><span className="font-medium">Pre-Op Medication:</span><p className="text-muted-foreground whitespace-pre-wrap">{note.preop_medication || "\u2014"}</p></div>
                <div className="text-sm"><span className="font-medium">Drugs Used:</span><p className="text-muted-foreground whitespace-pre-wrap">{note.anesthesia_drugs || "\u2014"}</p></div>
                <div className="text-sm"><span className="font-medium">Recovery Status:</span><p className="text-muted-foreground">{note.recovery_status || "\u2014"}</p></div>
                <div className="text-sm"><span className="font-medium">Post-Op Orders:</span><p className="text-muted-foreground whitespace-pre-wrap">{note.postop_orders?.items?.join(", ") || "\u2014"}</p></div>
                {note.input_output_notes && <div className="text-sm"><span className="font-medium">I/O During Surgery:</span><p className="text-muted-foreground whitespace-pre-wrap">{note.input_output_notes}</p></div>}
                {note.intraop_assessment?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Intra-Op Assessment:</span>
                    <div className="overflow-x-auto mt-1">
                      <Table>
                        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>HR</TableHead><TableHead>SpO₂</TableHead><TableHead>BP</TableHead></TableRow></TableHeader>
                        <TableBody>{(note.intraop_assessment as any[]).map((row: any, i: number) => (
                          <TableRow key={i}><TableCell>{row.time || "\u2014"}</TableCell><TableCell>{row.hr || "\u2014"}</TableCell><TableCell>{row.spo2 || "\u2014"}</TableCell><TableCell>{row.bp || "\u2014"}</TableCell></TableRow>
                        ))}</TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ))}
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

function downloadPdf(title: string, rows: any[], columns: { h: string; f: (r: any) => string }[]) {
  const pdf = new jsPDF("l", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth();
  let y = 15;
  pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
  pdf.text(title, pw / 2, y, { align: "center" }); y += 10;
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  const colW = (pw - 30) / columns.length;
  // Header
  pdf.setFillColor(50, 50, 50); pdf.setTextColor(255);
  columns.forEach((c, i) => { pdf.text(c.h, 15 + i * colW + colW / 2, y + 3, { align: "center" }); });
  pdf.rect(15, y - 1, pw - 30, 7, "F");
  y += 8; pdf.setTextColor(0);
  // Rows
  rows.forEach((r) => {
    if (y > 185) { pdf.addPage(); y = 15; }
    columns.forEach((c, i) => { pdf.text(c.f(r), 15 + i * colW + colW / 2, y + 3, { align: "center" }); });
    y += 6;
  });
  pdf.save(`${title.replace(/\s+/g, "_")}.pdf`);
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
