import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
}

interface VitalsRow {
  time: string;
  temp: string;
  pulse: string;
  bpSystolic: string;
  bpDiastolic: string;
  rr: string;
  spo2: string;
}

export function PostAdmissionEntry({ open, onOpenChange, admission, patientName }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hs, setHs] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [ward, setWard] = useState<any>(null);
  const [bed, setBed] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [vitalsRows, setVitalsRows] = useState<VitalsRow[]>(
    Array.from({ length: 10 }, () => ({ time: "", temp: "", pulse: "", bpSystolic: "", bpDiastolic: "", rr: "", spo2: "" }))
  );
  const [ivFluid, setIvFluid] = useState({ time: "", fluidType: "", volume: "", rate: "", notes: "" });
  const [io, setIo] = useState({ time: "", intake: "", output: "", notes: "" });

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const [hsRes, patRes, wardRes, bedRes, docRes] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,logo_url").maybeSingle(),
        supabase.from("patients").select("*").eq("id", admission.patient_id).maybeSingle(),
        admission.ward_id ? supabase.from("wards").select("name").eq("id", admission.ward_id).maybeSingle() : { data: null },
        admission.bed_id ? supabase.from("beds").select("bed_number").eq("id", admission.bed_id).maybeSingle() : { data: null },
        admission.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", admission.doctor_id).maybeSingle() : { data: null },
      ]);
      setHs(hsRes.data);
      setPatient(patRes.data);
      setWard(wardRes.data);
      setBed(bedRes.data);
      setDoctor(docRes.data);
      setLoading(false);
    })();
  }, [open, admission]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const toInsert: any[] = [];

      vitalsRows.forEach((r) => {
        if (!r.temp && !r.pulse && !r.bpSystolic) return;
        toInsert.push({
          admission_id: admission.id,
          entry_type: "vitals",
          recorded_at: r.time || new Date().toISOString(),
          temperature: r.temp ? Number(r.temp) : null,
          pulse: r.pulse ? Number(r.pulse) : null,
          bp_systolic: r.bpSystolic ? Number(r.bpSystolic) : null,
          bp_diastolic: r.bpDiastolic ? Number(r.bpDiastolic) : null,
          respiratory_rate: r.rr ? Number(r.rr) : null,
          oxygen_saturation: r.spo2 ? Number(r.spo2) : null,
          recorded_by: profile?.id,
        });
      });

      if (ivFluid.fluidType) {
        toInsert.push({
          admission_id: admission.id,
          entry_type: "iv_fluid",
          recorded_at: ivFluid.time || new Date().toISOString(),
          fluid_type: ivFluid.fluidType,
          fluid_volume_ml: ivFluid.volume ? Number(ivFluid.volume) : null,
          fluid_rate: ivFluid.rate || null,
          notes: ivFluid.notes || null,
          recorded_by: profile?.id,
        });
      }

      if (io.intake || io.output) {
        toInsert.push({
          admission_id: admission.id,
          entry_type: "intake_output",
          recorded_at: io.time || new Date().toISOString(),
          intake_ml: io.intake ? Number(io.intake) : null,
          output_ml: io.output ? Number(io.output) : null,
          notes: io.notes || null,
          recorded_by: profile?.id,
        });
      }

      if (toInsert.length === 0) { toast.error("No data to save"); setSaving(false); return; }

      const { error } = await supabase.from("ipd_treatment_chart").insert(toInsert);
      if (error) throw error;
      toast.success(`${toInsert.length} entries saved`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateVitals = (idx: number, field: keyof VitalsRow, value: string) => {
    const rows = [...vitalsRows];
    rows[idx] = { ...rows[idx], [field]: value };
    setVitalsRows(rows);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
          <div className="flex justify-center p-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {hs?.logo_url && <img src={hs.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" />}
            <div>
              <DialogTitle>Post-Admission Entry — {admission?.admission_number}</DialogTitle>
              <p className="text-sm text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <Button onClick={saveAll} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save All"}</Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admission Summary */}
          <div className="bg-muted rounded-md p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="text-xs text-muted-foreground">Ward</span><p className="font-medium">{ward?.name || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Bed</span><p className="font-medium">{bed?.bed_number || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Doctor</span><p className="font-medium">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Admitted</span><p className="font-medium">{admission.admission_date ? format(new Date(admission.admission_date), "MMM d, HH:mm") : "—"}</p></div>
          </div>

          {/* Vitals */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Vitals</h4>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
                <thead>
                  <tr className="border-b text-xs">
                    <th className="p-1 text-left" style={{ width: "100px" }}>Time</th>
                    <th className="p-1 text-left" style={{ width: "60px" }}>Temp</th>
                    <th className="p-1 text-left" style={{ width: "55px" }}>Pulse</th>
                    <th className="p-1 text-left" style={{ width: "70px" }}>BP Sys</th>
                    <th className="p-1 text-left" style={{ width: "70px" }}>BP Dia</th>
                    <th className="p-1 text-left" style={{ width: "55px" }}>RR</th>
                    <th className="p-1 text-left" style={{ width: "55px" }}>SpO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsRows.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-1"><Input type="datetime-local" value={row.time} onChange={e => updateVitals(idx, "time", e.target.value)} className="h-7 text-xs" /></td>
                      <td className="p-1"><Input type="number" step="0.1" value={row.temp} onChange={e => updateVitals(idx, "temp", e.target.value)} className="h-7 text-xs" placeholder="°C" /></td>
                      <td className="p-1"><Input type="number" value={row.pulse} onChange={e => updateVitals(idx, "pulse", e.target.value)} className="h-7 text-xs" placeholder="/min" /></td>
                      <td className="p-1"><Input type="number" value={row.bpSystolic} onChange={e => updateVitals(idx, "bpSystolic", e.target.value)} className="h-7 text-xs" placeholder="Sys" /></td>
                      <td className="p-1"><Input type="number" value={row.bpDiastolic} onChange={e => updateVitals(idx, "bpDiastolic", e.target.value)} className="h-7 text-xs" placeholder="Dia" /></td>
                      <td className="p-1"><Input type="number" value={row.rr} onChange={e => updateVitals(idx, "rr", e.target.value)} className="h-7 text-xs" placeholder="/min" /></td>
                      <td className="p-1"><Input type="number" step="0.1" value={row.spo2} onChange={e => updateVitals(idx, "spo2", e.target.value)} className="h-7 text-xs" placeholder="%" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IV Fluids */}
          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">IV Fluids</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div><Label className="text-xs">Time</Label><Input type="datetime-local" value={ivFluid.time} onChange={e => setIvFluid({ ...ivFluid, time: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Fluid Type</Label><Input value={ivFluid.fluidType} onChange={e => setIvFluid({ ...ivFluid, fluidType: e.target.value })} className="h-8 text-xs" placeholder="e.g. Normal Saline" /></div>
              <div><Label className="text-xs">Volume (ml)</Label><Input type="number" value={ivFluid.volume} onChange={e => setIvFluid({ ...ivFluid, volume: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Rate</Label><Input value={ivFluid.rate} onChange={e => setIvFluid({ ...ivFluid, rate: e.target.value })} className="h-8 text-xs" placeholder="e.g. 100ml/hr" /></div>
              <div><Label className="text-xs">Notes</Label><Input value={ivFluid.notes} onChange={e => setIvFluid({ ...ivFluid, notes: e.target.value })} className="h-8 text-xs" /></div>
            </div>
          </div>

          {/* I/O */}
          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Intake / Output</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><Label className="text-xs">Time</Label><Input type="datetime-local" value={io.time} onChange={e => setIo({ ...io, time: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Intake (ml)</Label><Input type="number" value={io.intake} onChange={e => setIo({ ...io, intake: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Output (ml)</Label><Input type="number" value={io.output} onChange={e => setIo({ ...io, output: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Notes</Label><Input value={io.notes} onChange={e => setIo({ ...io, notes: e.target.value })} className="h-8 text-xs" /></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
