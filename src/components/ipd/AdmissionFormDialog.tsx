import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Printer, Download, Save } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
  autoPrint?: boolean;
  clinicalEntry?: boolean;
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

interface Hs {
  hospital_name: string;
  hospital_address: string;
  contact_number: string;
  logo_url: string | null;
}

export function AdmissionFormDialog({ open, onOpenChange, admission, patientName, autoPrint, clinicalEntry }: Props) {
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [savingClinical, setSavingClinical] = useState(false);
  const [hs, setHs] = useState<Hs | null>(null);
  const [adm, setAdm] = useState<any>(null);
  const [prof, setProf] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [ward, setWard] = useState<any>(null);
  const [bed, setBed] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [doctorProf, setDoctorProf] = useState<any>(null);
  const [vitalsRows, setVitalsRows] = useState<VitalsRow[]>(
    Array.from({ length: 10 }, () => ({ time: "", temp: "", pulse: "", bpSystolic: "", bpDiastolic: "", rr: "", spo2: "" }))
  );
  const [ivFluid, setIvFluid] = useState({ time: "", fluidType: "", volume: "", rate: "", notes: "" });
  const [io, setIo] = useState({ time: "", intake: "", output: "", notes: "" });

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      // Always fetch latest admission data so ward_id/bed_id/doctor_id are fresh
      const { data: fresh } = await supabase
        .from("ipd_admissions")
        .select("*, beds(bed_number,daily_charge), wards(name)")
        .eq("id", admission.id)
        .maybeSingle();
      const a = fresh || admission;

      const [hsRes, profRes, patRes, drRes, drProfRes] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,hospital_address,contact_number,logo_url").maybeSingle(),
        supabase.from("profiles").select("first_name,last_name,phone,email").eq("id", a.patient_id).maybeSingle(),
        supabase.from("patients").select("*").eq("id", a.patient_id).maybeSingle(),
        a.doctor_id ? supabase.from("doctors").select("specialization,consultation_fee").eq("id", a.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
        a.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", a.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      setAdm(a);
      setHs(hsRes.data);
      setProf(profRes.data);
      setPatient(patRes.data);
      setWard(a.wards || null);
      setBed(a.beds || null);
      setDoctor(drRes.data);
      setDoctorProf(drProfRes.data);
      setLoading(false);
    })();
  }, [open, admission]);

  useEffect(() => {
    if (autoPrint && open && !loading && hs) {
      const t = setTimeout(() => print(), 500);
      return () => clearTimeout(t);
    }
  }, [autoPrint, open, loading, hs]);

  const print = () => {
    const html = document.getElementById("admission-form-content")?.outerHTML || "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Admission Form</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
      .form-container { max-width: 190mm; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
      .header p { margin: 2px 0; font-size: 11px; color: #333; }
      .header h2 { margin: 6px 0 0 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      td { border: 1px solid #000; padding: 5px 7px; font-size: 11px; vertical-align: top; }
      .lbl { font-weight: bold; width: 130px; background: #f5f5f5; }
      .section-title { background: transparent !important; color: #000 !important; font-weight: bold; font-size: 12px; text-align: center; padding: 6px; }
      .sig-line { border-bottom: 1px solid #000; min-height: 32px; }
      .footer { text-align: center; font-size: 9px; color: #888; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 6px; }
    </style></head><body><div class="form-container">${html}</div>
    <script>window.print();</script></body></html>`);
    w.document.close();
  };

  const downloadPdf = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const m = 15;
    let y = m;
    const sect = (title: string) => {
      if (y > 270) { pdf.addPage(); y = m; }
      pdf.setFillColor(34, 34, 34); pdf.rect(m, y, pw - m * 2, 7, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
      pdf.text(title, pw / 2, y + 5, { align: "center" });
      pdf.setTextColor(0, 0, 0); y += 10;
    };
    const R = (l: string, v: string, l2?: string, v2?: string, l3?: string, v3?: string) => {
      if (y > 280) { pdf.addPage(); y = m; }
      pdf.setFontSize(9);
      const cw = (pw - m * 2) / 3;
      const draw = (x: number, lbl: string, val: string) => {
        pdf.setFont("helvetica", "bold"); pdf.text(lbl, m + x, y);
        pdf.setFont("helvetica", "normal"); pdf.text(val || "___________________", m + x + 35, y);
      };
      draw(0, l + ":", v);
      if (l2) draw(cw, l2 + ":", v2 || "");
      if (l3) draw(cw * 2, l3 + ":", v3 || "");
      y += 5.5;
    };

    pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
    pdf.text(hs?.hospital_name || "Hospital", pw / 2, y, { align: "center" }); y += 6;
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
    if (hs?.hospital_address) { pdf.text(hs.hospital_address, pw / 2, y, { align: "center" }); y += 4; }
    if (hs?.contact_number) { pdf.text(`Phone: ${hs.contact_number}`, pw / 2, y, { align: "center" }); y += 4; }
    pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
    pdf.text("PATIENT ADMISSION FORM", pw / 2, y, { align: "center" }); y += 7;
    pdf.setLineWidth(0.5); pdf.line(m, y, pw - m, y); y += 6;

    sect("ADMISSION DETAILS");
    R("Admission #", adm?.admission_number || "—", "Date", adm?.admission_date ? format(new Date(adm.admission_date), "dd/MM/yyyy HH:mm") : "—", "Status", adm?.status || "—");
    R("Ward", ward?.name || "—", "Bed #", bed?.bed_number || "—");
    R("Consultant", doctorProf ? `Dr. ${doctorProf.first_name} ${doctorProf.last_name}` : "—", "Source", adm?.source || "—");
    if (doctor?.specialization) R("Specialization", doctor.specialization);
    y += 2;

    sect("PATIENT INFORMATION");
    R("Patient Name", patientName, "Phone", prof?.phone || "—");
    R("CNIC", patient?.cnic || "—", "DOB", patient?.date_of_birth ? format(new Date(patient.date_of_birth), "dd/MM/yyyy") : "—");
    R("Blood Group", patient?.blood_type || "—", "City", patient?.city || "—");
    R("Province", patient?.province || "—", "Address", patient?.address || "—");
    if (patient?.emergency_contact_name) {
      R("Emergency Contact", patient.emergency_contact_name, "Phone", patient.emergency_contact_phone || "—");
    }
    y += 2;

    sect("MEDICAL INFORMATION");
    R("Chief Complaint", adm?.chief_complaint || "—");
    R("Provisional Diagnosis", adm?.provisional_diagnosis || "—");
    if (adm?.final_diagnosis) R("Final Diagnosis", adm.final_diagnosis);
    R("Allergies", patient?.allergies || "None");
    if (adm?.notes) R("Notes", adm.notes);
    y += 5;

    sect("UNDERTAKING");
    const uy = y;
    pdf.setFontSize(8.5); pdf.setFont("helvetica", "normal");
    const undertaking = [
      "1. I/We undertake that the above information given by me/us is correct to the best of my/our knowledge.",
      "2. I/We agree to abide by the rules and regulations of the hospital.",
      "3. I/We give consent for the necessary medical treatment, diagnostic procedures, and surgical operations.",
      "4. I/We undertake to make the payment of all hospital charges as per the hospital billing policy.",
      "5. I/We agree that the hospital authorities can use the patient's data for medical and research purposes.",
      "6. I/We have read and understood the terms and conditions mentioned above.",
    ];
    undertaking.forEach((t) => { pdf.text(t, m + 2, y); y += 4.5; });
    y += 3;
    pdf.setFontSize(9);
    pdf.text("Patient/Guardian Name: _________________________", m + 2, y); y += 6;
    pdf.text("Signature: _________________________", m + 2, y); y += 6;
    pdf.text("Date: " + format(new Date(), "dd/MM/yyyy"), m + 2, y); y += 6;
    pdf.text("Witness: _________________________", pw - m - 60, uy + undertaking.length * 4.5 + 12);

    y = Math.max(y, pdf.internal.pageSize.getHeight() - 15);
    pdf.setFontSize(8); pdf.setTextColor(150);
    pdf.text(`Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pw / 2, y, { align: "center" });

    pdf.save(`Admission_Form_${admission?.admission_number || "unknown"}.pdf`);
  };

  const saveClinical = async () => {
    setSavingClinical(true);
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
      if (toInsert.length === 0) { toast.error("No clinical data to save"); setSavingClinical(false); return; }
      const { error } = await supabase.from("ipd_treatment_chart").insert(toInsert);
      if (error) throw error;
      toast.success(`${toInsert.length} clinical entries saved`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save clinical data");
    } finally {
      setSavingClinical(false);
    }
  };

  const P = (l: string, v: string, l2?: string, v2?: string, l3?: string, v3?: string) => (
    <tr>
      <td className="lbl">{l}</td>
      <td style={{ width: l2 ? "23%" : "auto" }}>{v || "—"}</td>
      {l2 && <td className="lbl" style={{ width: "90px" }}>{l2}</td>}
      {l2 && <td style={{ width: l3 ? "23%" : "auto" }}>{v2 || "—"}</td>}
      {l3 && <td className="lbl" style={{ width: "70px" }}>{l3}</td>}
      {l3 && <td>{v3 || "—"}</td>}
    </tr>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Admission Form</DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={print}><Printer className="w-4 h-4 mr-1" />Print</Button>
            <Button size="sm" onClick={downloadPdf}><Download className="w-4 h-4 mr-1" />PDF</Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div id="admission-form-content" ref={printRef} style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#000" }}>
            {/* ---- HEADER ---- */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 14 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>{hs?.hospital_name || "Hospital"}</h1>
              {hs?.hospital_address && <p style={{ margin: "2px 0", fontSize: 11, color: "#333" }}>{hs.hospital_address}</p>}
              {hs?.contact_number && <p style={{ margin: "2px 0", fontSize: 11, color: "#333" }}>Phone: {hs.contact_number}</p>}
              <h2 style={{ margin: "6px 0 0 0", fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}>Patient Admission Form</h2>
            </div>

            {/* ---- ADMISSION DETAILS ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr><td colSpan={6} style={{ fontWeight: "bold", fontSize: 12, textAlign: "center", padding: 6, border: "1px solid #000" }}>ADMISSION DETAILS</td></tr>
              {P("Admission #", adm?.admission_number || "—", "Date", adm?.admission_date ? format(new Date(adm.admission_date), "dd/MM/yyyy HH:mm") : "—", "Status", adm?.status || "—")}
              {P("Ward", ward?.name || "—", "Bed #", bed?.bed_number || "—")}
              {P("Consultant", doctorProf ? `Dr. ${doctorProf.first_name} ${doctorProf.last_name}` : "—", "Source", adm?.source || "—")}
              {doctor?.specialization && P("Specialization", doctor.specialization)}
            </table>

            {/* ---- PATIENT INFORMATION ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr><td colSpan={6} style={{ fontWeight: "bold", fontSize: 12, textAlign: "center", padding: 6, border: "1px solid #000" }}>PATIENT INFORMATION</td></tr>
              {P("Patient Name", patientName, "Patient #", patient?.patient_number || "—")}
              {P("Phone", prof?.phone || "—", "CNIC", patient?.cnic || "—")}
              {P("DOB", patient?.date_of_birth ? format(new Date(patient.date_of_birth), "dd/MM/yyyy") : "—", "Blood Group", patient?.blood_type || "—")}
              {P("Address", patient?.address || "—")}
              {patient?.emergency_contact_name && P("Emergency Contact", `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` (${patient.emergency_contact_phone})` : ""}`)}
            </table>

            {/* ---- MEDICAL INFORMATION ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr><td colSpan={6} className="section-title">MEDICAL INFORMATION</td></tr>
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Chief Complaint:</strong> {adm?.chief_complaint || "—"}
              </td></tr>
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Provisional Diagnosis:</strong> {adm?.provisional_diagnosis || "—"}
              </td></tr>
              {adm?.final_diagnosis && <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Final Diagnosis:</strong> {adm.final_diagnosis}
              </td></tr>}
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Allergies:</strong> {patient?.allergies || "None recorded"}
              </td></tr>
              {adm?.notes && <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Notes:</strong> {adm.notes}
              </td></tr>}
            </table>

            {/* ---- UNDERTAKING ---- */}
            <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 12 }}>
              <tr><td className="section-title">UNDERTAKING</td></tr>
              <tr><td style={{ padding: "6px 8px", border: "1px solid #000", fontSize: 10, lineHeight: 1.5 }}>
                <p style={{ margin: "2px 0" }}>1. I/We undertake that the above information given by me/us is correct to the best of my/our knowledge.</p>
                <p style={{ margin: "2px 0" }}>2. I/We agree to abide by the rules and regulations of the hospital.</p>
                <p style={{ margin: "2px 0" }}>3. I/We give consent for the necessary medical treatment, diagnostic procedures, and surgical operations.</p>
                <p style={{ margin: "2px 0" }}>4. I/We undertake to make the payment of all hospital charges as per the hospital billing policy.</p>
                <p style={{ margin: "2px 0" }}>5. I/We agree that the hospital authorities can use the patient's data for medical and research purposes.</p>
                <p style={{ margin: "2px 0" }}>6. I/We have read and understood the terms and conditions mentioned above.</p>
              </td></tr>
            </table>

            {/* ---- SIGNATURES ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={{ width: "50%", border: "1px solid #000", padding: "8px 10px" }}>
                  <strong>Patient / Guardian:</strong>
                  <div style={{ borderBottom: "1px solid #000", marginTop: 20, marginBottom: 4, height: 24 }}></div>
                  <span style={{ fontSize: 10 }}>Name & Signature</span>
                </td>
                <td style={{ width: "50%", border: "1px solid #000", padding: "8px 10px" }}>
                  <strong>Witness:</strong>
                  <div style={{ borderBottom: "1px solid #000", marginTop: 20, marginBottom: 4, height: 24 }}></div>
                  <span style={{ fontSize: 10 }}>Name & Signature</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px", fontSize: 10 }}>
                  <strong>Date:</strong> {format(new Date(), "dd/MM/yyyy")}
                </td>
              </tr>
            </table>

            <div style={{ textAlign: "center", fontSize: 9, color: "#888", marginTop: 12, borderTop: "1px solid #ccc", paddingTop: 6 }}>
              Generated on {format(new Date(), "dd/MM/yyyy HH:mm")} — {hs?.hospital_name || "Hospital"}
            </div>
          </div>

          {clinicalEntry && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Clinical Entry</h3>
                <Button size="sm" onClick={saveClinical} disabled={savingClinical}>
                  <Save className="w-4 h-4 mr-1" />{savingClinical ? "Saving..." : "Save Clinical Data"}
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Vitals</h4>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
                    <thead>
                      <tr className="border-b text-xs">
                        <th className="p-1 text-left" style={{ width: "110px" }}>Time</th>
                        <th className="p-1 text-left" style={{ width: "60px" }}>Temp</th>
                        <th className="p-1 text-left" style={{ width: "55px" }}>Pulse</th>
                        <th className="p-1 text-left" style={{ width: "65px" }}>BP Sys</th>
                        <th className="p-1 text-left" style={{ width: "65px" }}>BP Dia</th>
                        <th className="p-1 text-left" style={{ width: "55px" }}>RR</th>
                        <th className="p-1 text-left" style={{ width: "55px" }}>SpO₂</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitalsRows.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-1"><Input type="datetime-local" value={row.time} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], time: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" /></td>
                          <td className="p-1"><Input type="number" step="0.1" value={row.temp} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], temp: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="°C" /></td>
                          <td className="p-1"><Input type="number" value={row.pulse} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], pulse: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="/min" /></td>
                          <td className="p-1"><Input type="number" value={row.bpSystolic} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], bpSystolic: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="Sys" /></td>
                          <td className="p-1"><Input type="number" value={row.bpDiastolic} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], bpDiastolic: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="Dia" /></td>
                          <td className="p-1"><Input type="number" value={row.rr} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], rr: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="/min" /></td>
                          <td className="p-1"><Input type="number" step="0.1" value={row.spo2} onChange={e => { const r = [...vitalsRows]; r[idx] = { ...r[idx], spo2: e.target.value }; setVitalsRows(r); }} className="h-7 text-xs" placeholder="%" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-2">
                <h4 className="text-sm font-medium mb-1">IV Fluids</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div><Label className="text-xs">Time</Label><Input type="datetime-local" value={ivFluid.time} onChange={e => setIvFluid({ ...ivFluid, time: e.target.value })} className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">Fluid Type</Label><Input value={ivFluid.fluidType} onChange={e => setIvFluid({ ...ivFluid, fluidType: e.target.value })} className="h-8 text-xs" placeholder="e.g. Normal Saline" /></div>
                  <div><Label className="text-xs">Volume (ml)</Label><Input type="number" value={ivFluid.volume} onChange={e => setIvFluid({ ...ivFluid, volume: e.target.value })} className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">Rate</Label><Input value={ivFluid.rate} onChange={e => setIvFluid({ ...ivFluid, rate: e.target.value })} className="h-8 text-xs" placeholder="e.g. 100ml/hr" /></div>
                  <div><Label className="text-xs">Notes</Label><Input value={ivFluid.notes} onChange={e => setIvFluid({ ...ivFluid, notes: e.target.value })} className="h-8 text-xs" /></div>
                </div>
              </div>

              <div className="border-t pt-2">
                <h4 className="text-sm font-medium mb-1">Intake / Output</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div><Label className="text-xs">Time</Label><Input type="datetime-local" value={io.time} onChange={e => setIo({ ...io, time: e.target.value })} className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">Intake (ml)</Label><Input type="number" value={io.intake} onChange={e => setIo({ ...io, intake: e.target.value })} className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">Output (ml)</Label><Input type="number" value={io.output} onChange={e => setIo({ ...io, output: e.target.value })} className="h-8 text-xs" /></div>
                  <div><Label className="text-xs">Notes</Label><Input value={io.notes} onChange={e => setIo({ ...io, notes: e.target.value })} className="h-8 text-xs" /></div>
                </div>
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}