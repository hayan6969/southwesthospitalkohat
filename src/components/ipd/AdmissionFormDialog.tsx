import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
  autoPrint?: boolean;
}

interface Hs {
  hospital_name: string;
  hospital_address: string;
  contact_number: string;
  logo_url: string | null;
}

export function AdmissionFormDialog({ open, onOpenChange, admission, patientName, autoPrint }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hs, setHs] = useState<Hs | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [ward, setWard] = useState<any>(null);
  const [bed, setBed] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const [a, b, c, d, e, f] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,hospital_address,contact_number,logo_url").maybeSingle(),
        supabase.from("profiles").select("first_name,last_name,phone,email").eq("id", admission.patient_id).maybeSingle(),
        supabase.from("patients").select("*").eq("id", admission.patient_id).maybeSingle(),
        admission.ward_id ? supabase.from("wards").select("name").eq("id", admission.ward_id).maybeSingle() : { data: null },
        admission.bed_id ? supabase.from("beds").select("bed_number,daily_charge").eq("id", admission.bed_id).maybeSingle() : { data: null },
        admission.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", admission.doctor_id).maybeSingle() : { data: null },
      ]);
      setHs(a.data);
      setProfile(b.data);
      setPatient(c.data);
      setWard(d.data);
      setBed(e.data);
      setDoctor(f.data);
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
      .section-title { background: #222 !important; color: #fff; font-weight: bold; font-size: 12px; text-align: center; padding: 6px; }
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
    R("Admission #", admission?.admission_number || "—", "Date", admission?.admission_date ? format(new Date(admission.admission_date), "dd/MM/yyyy HH:mm") : "—", "Status", admission?.status || "—");
    R("Ward", ward?.name || "—", "Bed #", bed?.bed_number || "—");
    R("Consultant", doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "—", "Source", admission?.source || "—");
    y += 2;

    sect("PATIENT INFORMATION");
    R("Patient Name", patientName, "Phone", profile?.phone || "—");
    R("CNIC", patient?.cnic || "—", "DOB", patient?.date_of_birth ? format(new Date(patient.date_of_birth), "dd/MM/yyyy") : "—");
    R("Blood Group", patient?.blood_type || "—", "City", patient?.city || "—");
    R("Province", patient?.province || "—", "Address", patient?.address || "—");
    if (patient?.emergency_contact_name) {
      R("Emergency Contact", patient.emergency_contact_name, "Phone", patient.emergency_contact_phone || "—");
    }
    y += 2;

    sect("MEDICAL INFORMATION");
    R("Chief Complaint", admission?.chief_complaint || "—");
    R("Provisional Diagnosis", admission?.provisional_diagnosis || "—");
    R("Allergies", patient?.allergies || "None");
    if (admission?.notes) R("Notes", admission.notes);
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
              <tr><td colSpan={6} className="section-title">ADMISSION DETAILS</td></tr>
              {P("Admission #", admission?.admission_number || "—", "Date", admission?.admission_date ? format(new Date(admission.admission_date), "dd/MM/yyyy HH:mm") : "—", "Status", admission?.status || "—")}
              {P("Ward", ward?.name || "—", "Bed #", bed?.bed_number || "—")}
              {P("Consultant", doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "—", "Source", admission?.source || "—")}
            </table>

            {/* ---- PATIENT INFORMATION ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr><td colSpan={6} className="section-title">PATIENT INFORMATION</td></tr>
              {P("Patient Name", patientName, "Phone", profile?.phone || "—")}
              {P("CNIC", patient?.cnic || "—", "DOB", patient?.date_of_birth ? format(new Date(patient.date_of_birth), "dd/MM/yyyy") : "—")}
              {P("Blood Group", patient?.blood_type || "—", "City", patient?.city || "—")}
              {P("Province", patient?.province || "—", "Address", patient?.address || "—")}
              {patient?.emergency_contact_name && P("Emergency Contact", `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` (${patient.emergency_contact_phone})` : ""}`)}
            </table>

            {/* ---- MEDICAL INFORMATION ---- */}
            <table cellPadding={0} cellSpacing={0}>
              <tr><td colSpan={6} className="section-title">MEDICAL INFORMATION</td></tr>
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Chief Complaint:</strong> {admission?.chief_complaint || "—"}
              </td></tr>
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Provisional Diagnosis:</strong> {admission?.provisional_diagnosis || "—"}
              </td></tr>
              <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Allergies:</strong> {patient?.allergies || "None recorded"}
              </td></tr>
              {admission?.notes && <tr><td colSpan={6} style={{ padding: "5px 7px", border: "1px solid #000" }}>
                <strong>Notes:</strong> {admission.notes}
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
        )}
      </DialogContent>
    </Dialog>
  );
}