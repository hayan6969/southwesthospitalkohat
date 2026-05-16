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
import { Loader2, Plus, Activity, StickyNote, Droplets, Pill, FlaskConical, Printer, Syringe } from "lucide-react";
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
  const [anesthesiaNotes, setAnesthesiaNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showAnesthesiaDialog, setShowAnesthesiaDialog] = useState(false);
  const [admissionData, setAdmissionData] = useState<any>(null);
  const [hospitalSettings, setHospitalSettings] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [wardData, setWardData] = useState<any>(null);
  const [bedData, setBedData] = useState<any>(null);

  const canWrite = ["admin", "doctor", "nurse", "ota", "staff", "ipd"].includes(profile?.role as string);
  const isDoctor = profile?.role === "doctor";

  const load = async () => {
    if (!admissionId) return;
    setLoading(true);
    
    const [{ data: adm }, { data: hs }] = await Promise.all([
      supabase.from("ipd_admissions").select("*, beds(bed_number,daily_charge), wards(name)").eq("id", admissionId).maybeSingle(),
      supabase.from("hospital_settings").select("hospital_name,hospital_address,contact_number,logo_url").maybeSingle(),
    ]);
    
    if (adm) {
      setAdmissionData(adm);
      setHospitalSettings(hs);
      setWardData(adm.wards || null);
      setBedData(adm.beds || null);
      
      const [{ data: pat }, { data: docProf }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", adm.patient_id).maybeSingle(),
        adm.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", adm.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setPatientData(pat);
      setDoctorProfile(docProf);
    }
    
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
      supabase.from("ipd_treatment_chart").select("*").eq("admission_id", admissionId).order("recorded_at", { ascending: true }),
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

  const printClinicalSheet = () => {
    const hn = hospitalSettings?.hospital_name || "Hospital";
    const ha = hospitalSettings?.hospital_address || "";
    const hc = hospitalSettings?.contact_number || "";
    const a = admissionData;
    const admNum = a?.admission_number || admissionNumber || admissionId;
    const wName = wardData?.name || "";
    const bNum = bedData?.bed_number || "";
    const docName = doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : "";
    const patPhone = patientData?.phone || "";
    const patCnic = patientData?.cnic || "";
    const patDob = patientData?.date_of_birth ? format(new Date(patientData.date_of_birth), "dd/MM/yyyy") : "";
    const patBlood = patientData?.blood_type || "";
    const patCity = patientData?.city || "";
    const patAddress = patientData?.address || "";
    const patProvince = patientData?.province || "";
    const chiefComplaint = a?.chief_complaint || "";
    const provisionalDx = a?.provisional_diagnosis || "";
    const finalDx = a?.final_diagnosis || "";
    const allergies = patientData?.allergies || "";
    const patNotes = a?.notes || "";
    const source = a?.source || "";
    const admDate = a?.admission_date ? format(new Date(a.admission_date), "dd/MM/yyyy HH:mm") : "";
    const now = format(new Date(), "dd/MM/yyyy HH:mm");

    const d = (v: any, fallback = "—") => v != null && v !== "" ? v : fallback;

    const vitals = entries.filter(e => e.entry_type === "vitals").sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const ivs = entries.filter(e => e.entry_type === "iv_fluid");
    const ios = entries.filter(e => e.entry_type === "intake_output");
    const doctorNotes = entries.filter(e => e.entry_type === "doctor_note");
    const nursingNotes = entries.filter(e => e.entry_type === "nursing_note");

    const vitalsRows = vitals.map(v => `<tr>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${format(new Date(v.recorded_at), "dd/MM HH:mm")}</td>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(v.temperature)}</td>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(v.pulse)}</td>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</td>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(v.respiratory_rate)}</td>
      <td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(v.oxygen_saturation)}</td>
    </tr>`).join("");
    const blankVitalsRows = Array.from({ length: Math.max(0, 12 - vitals.length) }, () =>
      `<tr>${Array.from({ length: 6 }, () => '<td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;">&nbsp;</td>').join("")}</tr>`
    ).join("");

    const ivRows = ivs.map(iv => `<tr>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${format(new Date(iv.recorded_at), "dd/MM HH:mm")}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(iv.fluid_type)}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${iv.fluid_volume_ml ? `${iv.fluid_volume_ml} ml` : "—"}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(iv.fluid_rate)}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(iv.notes)}</td>
    </tr>`).join("");
    const blankIvRows = Array.from({ length: Math.max(0, 15 - ivs.length) }, () =>
      `<tr>${Array.from({ length: 5 }, () => '<td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">&nbsp;</td>').join("")}</tr>`
    ).join("");

    const ioRows = ios.map(io => `<tr>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${format(new Date(io.recorded_at), "dd/MM HH:mm")}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${io.intake_ml ? `${io.intake_ml} ml` : "—"}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${io.output_ml ? `${io.output_ml} ml` : "—"}</td>
      <td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">${d(io.notes)}</td>
    </tr>`).join("");
    const blankIoRows = Array.from({ length: Math.max(0, 15 - ios.length) }, () =>
      `<tr>${Array.from({ length: 4 }, () => '<td style="height:40px;padding:4px 6px;font-size:11px;border:1px solid #000;">&nbsp;</td>').join("")}</tr>`
    ).join("");

    const anesthesiaHtml = anesthesiaNotes.map(note => {
      const intraopRows = (note.intraop_assessment as any[] || []).map((row: any) => `<tr>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">${d(row.time)}</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">${d(row.hr)}</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">${d(row.spo2)}</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">${d(row.bp)}</td>
      </tr>`).join("");
      const blankIntraopRows = Array.from({ length: Math.max(0, 5 - (note.intraop_assessment?.length || 0)) }, () => `<tr>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
        <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
      </tr>`).join("");

      const postOpItems = note.postop_orders?.items || [];
      const postOpHtml = postOpItems.map((item: string) => `<div style="width:48%;padding:1px 0;">[✓] ${item}</div>`).join("");

      return `<div style="margin-top:12px;border-top:1px solid #000;padding-top:6px;">
        <div style="font-size:10px;color:#666;margin-bottom:4px;">Recorded: ${format(new Date(note.created_at), "dd/MM/yyyy HH:mm")} | Status: ${d(note.status)}</div>
        <div style="margin-top:4px;"><strong>1. Surgical Procedure:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:22px;width:100%;margin:2px 0;padding:2px 0;">${d(note.surgical_procedure, "")}</div>

        <div style="margin-top:4px;"><strong>2. Brief Medical and Surgical History:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;padding:2px 0;">${d(note.brief_history, "")}</div>

        <div style="margin-top:4px;"><strong>3. Pre OP Vitals:</strong></div>
        <div style="font-size:11px;margin:2px 0 4px 0;">
          H.R: ${d(note.preop_hr)} &nbsp;&nbsp;&nbsp;&nbsp;
          B.P: ${d(note.preop_bp)} &nbsp;&nbsp;&nbsp;&nbsp;
          SPO2: ${d(note.preop_spo2)}%
        </div>

        <div style="margin-top:4px;"><strong>4. Pre OP Medication:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;padding:2px 0;">${d(note.preop_medication, "")}</div>

        <div style="margin-top:4px;"><strong>5. Mode of Anaesthesia:</strong></div>
        <div style="font-size:11px;margin:2px 0 4px 0;">${d(note.anesthesia_type)}</div>

        <div style="margin-top:4px;"><strong>6. Drugs used in Induction of Anaesthesia:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;padding:2px 0;">${d(note.anesthesia_drugs, "")}</div>

        <div style="text-align:center;font-weight:bold;font-size:12px;margin:8px 0 4px 0;border-top:1px solid #000;border-bottom:1px solid #000;padding:3px 0;">
          Intra OP Assessment
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
          <tr>
            <th style="border:1px solid #000;padding:3px 4px;font-size:10px;width:25%;">Time</th>
            <th style="border:1px solid #000;padding:3px 4px;font-size:10px;width:25%;">H.R</th>
            <th style="border:1px solid #000;padding:3px 4px;font-size:10px;width:25%;">SPO2</th>
            <th style="border:1px solid #000;padding:3px 4px;font-size:10px;width:25%;">B.P</th>
          </tr>
          ${intraopRows}${blankIntraopRows}
        </table>

        <div style="margin-top:2px;"><strong>Input / Output record during Surgery:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;padding:2px 0;">${d(note.input_output_notes, "")}</div>

        <div style="margin-top:2px;"><strong>Recovery Status:</strong></div>
        <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;padding:2px 0;">${d(note.recovery_status)}</div>

        <div style="margin-top:2px;"><strong>Post OP Orders:</strong></div>
        <div style="font-size:10px;margin:2px 0;display:flex;flex-wrap:wrap;">
          ${postOpHtml}
        </div>
        ${note.postop_orders?.notes ? `<div style="margin-top:4px;"><strong>Additional Notes:</strong></div><div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;padding:2px 0;">${note.postop_orders.notes}</div>` : ""}
      </div>`;
    }).join("");

    const doctorNotesHtml = doctorNotes.length > 0 ? doctorNotes.map(n => `<div style="margin:4px 0;padding:4px 8px;border-left:3px solid #3b82f6;background:#f8fafc;">
      <div style="font-size:9px;color:#666;">${format(new Date(n.recorded_at), "dd/MM/yyyy HH:mm")}</div>
      <div style="font-size:11px;white-space:pre-wrap;">${d(n.notes, "")}</div>
    </div>`).join("") : '<div style="color:#999;font-size:11px;">No doctor notes</div>';

    const nursingNotesHtml = nursingNotes.length > 0 ? nursingNotes.map(n => `<div style="margin:4px 0;padding:4px 8px;border-left:3px solid #10b981;background:#f0fdf4;">
      <div style="font-size:9px;color:#666;">${format(new Date(n.recorded_at), "dd/MM/yyyy HH:mm")}</div>
      <div style="font-size:11px;white-space:pre-wrap;">${d(n.notes, "")}</div>
    </div>`).join("") : '<div style="color:#999;font-size:11px;">No nursing notes</div>';

    const html = `<!DOCTYPE html><html><head><title>Treatment Chart — ${patientName || ""}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 0; color: #000; }
      .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
      .header p { margin: 2px 0; font-size: 11px; color: #333; }
      .header h2 { margin: 6px 0 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      td, th { border: 1px solid #000; padding: 4px 6px; font-size: 11px; vertical-align: middle; }
      th { font-weight: bold; text-align: center; font-size: 12px; background: transparent; }
      .lbl { font-weight: bold; width: 120px; background: #f5f5f5; font-size: 11px; }
      .section-title { font-weight: bold; font-size: 12px; text-align: center; padding: 5px; }
      .blank-line { border-bottom: 1px solid #000; min-height: 28px; width: 100%; display: block; }
      .blank-sm { border-bottom: 1px solid #000; min-height: 18px; width: 100%; display: block; }
      .footer { text-align: center; font-size: 9px; color: #888; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 4px; }
      .page-break { page-break-before: always; }
    </style></head><body>
    <div class="header">
      <h1>${hn}</h1>
      ${ha ? `<p>${ha}</p>` : ""}
      ${hc ? `<p>Phone: ${hc}</p>` : ""}
      <h2>Treatment Chart</h2>
    </div>
    <table>
      <tr><td class="lbl">Admission #</td><td style="width:23%">${admNum}</td>
          <td class="lbl" style="width:80px">Date</td><td style="width:23%">${admDate}</td>
          <td class="lbl" style="width:70px">Status</td><td>${a?.status || ""}</td></tr>
      <tr><td class="lbl">Ward</td><td>${wName}</td>
          <td class="lbl">Bed #</td><td>${bNum}</td>
          <td class="lbl">Source</td><td>${source}</td></tr>
      <tr><td class="lbl">Consultant</td><td colspan="5">${docName}</td></tr>
    </table>
    <table>
      <tr><td class="section-title" colspan="6">PATIENT INFORMATION</td></tr>
      <tr><td class="lbl">Patient Name</td><td style="width:23%">${patientName || ""}</td>
          <td class="lbl" style="width:80px">Phone</td><td colspan="3">${patPhone}</td></tr>
      <tr><td class="lbl">CNIC</td><td>${patCnic}</td>
          <td class="lbl">DOB</td><td>${patDob}</td>
          <td class="lbl">Blood</td><td>${patBlood}</td></tr>
      <tr><td class="lbl">City</td><td>${patCity}</td>
          <td class="lbl">Province</td><td>${patProvince}</td>
          <td class="lbl">Address</td><td>${patAddress}</td></tr>
    </table>
    <table>
      <tr><td class="section-title" colspan="6">MEDICAL INFORMATION</td></tr>
      <tr><td class="lbl">Chief Complaint</td><td colspan="5">${chiefComplaint}</td></tr>
      <tr><td class="lbl">Provisional Diagnosis</td><td colspan="5">${provisionalDx}</td></tr>
      ${finalDx ? `<tr><td class="lbl">Final Diagnosis</td><td colspan="5">${finalDx}</td></tr>` : ""}
      <tr><td class="lbl">Allergies</td><td colspan="5">${allergies || "None"}</td></tr>
      ${patNotes ? `<tr><td class="lbl">Notes</td><td colspan="5">${patNotes}</td></tr>` : ""}
    </table>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="6">VITALS RECORD</th></tr>
      <tr>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Temp (°C)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Pulse (/min)</th>
        <th style="width:26%;padding:6px 4px;font-size:12px;">BP (Sys / Dia)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">RR (/min)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">SpO₂ (%)</th>
      </tr>
      ${vitalsRows}${blankVitalsRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="5">IV FLUIDS</th></tr>
      <tr>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Fluid Type</th>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Volume (ml)</th>
        <th style="width:17%;padding:6px 4px;font-size:12px;">Rate</th>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Notes</th>
      </tr>
      ${ivRows}${blankIvRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="4">INTAKE / OUTPUT</th></tr>
      <tr>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Intake (ml)</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Output (ml)</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Notes</th>
      </tr>
      ${ioRows}${blankIoRows}
    </table>
    <div class="page-break"></div>
    <div style="font-family:'Courier New',monospace;font-size:11px;padding:6px;">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:bold;">${hn}</div>
        ${ha ? `<div style="font-size:10px;">${ha}</div>` : ""}
        <div style="font-size:13px;font-weight:bold;margin-top:8px;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;">ANAESTHESIA NOTES</div>
      </div>
      <table style="width:100%;margin-bottom:8px;">
        <tr>
          <td style="border:none;padding:1px 2px;width:45%;font-size:11px;">Pt's Name: <span style="border-bottom:1px solid #000;display:inline-block;width:200px;min-height:18px;">${patientName || ""}</span></td>
          <td style="border:none;padding:1px 2px;width:18%;font-size:11px;">Age: <span style="border-bottom:1px solid #000;display:inline-block;width:50px;min-height:18px;">${patientData?.date_of_birth ? Math.floor((Date.now() - new Date(patientData.date_of_birth).getTime()) / 31557600000) : "—"}</span></td>
          <td style="border:none;padding:1px 2px;width:17%;font-size:11px;">Gender: <span style="border-bottom:1px solid #000;display:inline-block;width:50px;min-height:18px;">${patientData?.gender || "—"}</span></td>
          <td style="border:none;padding:1px 2px;width:20%;font-size:11px;">Date: <span style="border-bottom:1px solid #000;display:inline-block;width:70px;min-height:18px;">${format(new Date(), "dd/MM/yyyy")}</span></td>
        </tr>
      </table>
      ${anesthesiaHtml || `<div style="text-align:center;color:#999;padding:20px;">No anaesthesia notes recorded</div>`}
      <div style="margin-top:16px;border-top:1px solid #000;padding-top:4px;font-size:11px;">
        Doctor / Anaesthetist Signature: <span style="border-bottom:1px solid #000;display:inline-block;width:220px;min-height:20px;"></span>
      </div>
      <div style="font-size:11px;margin-top:4px;">
        Date &amp; Time: <span style="border-bottom:1px solid #000;display:inline-block;width:180px;min-height:20px;"></span>
      </div>
    </div>
    <div class="page-break"></div>
    <div style="padding:6px;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:bold;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;">DOCTOR NOTES</div>
      </div>
      ${doctorNotesHtml}
    </div>
    <div class="page-break"></div>
    <div style="padding:6px;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:bold;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;">NURSING NOTES</div>
      </div>
      ${nursingNotesHtml}
    </div>
    <div class="footer">Generated on ${now} — ${hn} — ${patientName || ""} (${admNum})</div>
    <script>window.print();</script>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked. Please allow pop-ups for this site."); return; }
    w.document.write(html);
    w.document.close();
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
            <Button size="sm" variant="outline" onClick={printClinicalSheet} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print Clinical Sheet
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
            {/* Anaesthesia Notes - Add Button */}
            <div className="flex justify-end">
              {(profile?.role === "admin" || profile?.role === "doctor" || profile?.role === "anesthetist") ? (
                <Button size="sm" onClick={() => setShowAnesthesiaDialog(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  {anesthesiaNotes.length === 0 ? "Add Anaesthesia Notes" : "Edit / Add Notes"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Contact your doctor or anesthetist to add anaesthesia notes.</p>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : anesthesiaNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Syringe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No anaesthesia notes found for this admission.</p>
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
      <AnesthesiaNotesDialog
        open={showAnesthesiaDialog}
        onOpenChange={setShowAnesthesiaDialog}
        otSchedule={null}
        admissionId={admissionId}
        onSave={() => { setShowAnesthesiaDialog(false); load(); }}
      />
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
