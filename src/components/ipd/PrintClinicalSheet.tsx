import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
}

export function PrintClinicalSheet({ open, onOpenChange, admission, patientName }: Props) {
  const [loading, setLoading] = useState(true);
  const [hs, setHs] = useState<any>(null);
  const [ward, setWard] = useState<any>(null);
  const [bed, setBed] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const [hsRes, wardRes, bedRes, docRes] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,logo_url").maybeSingle(),
        admission.ward_id ? supabase.from("wards").select("name").eq("id", admission.ward_id).maybeSingle() : { data: null },
        admission.bed_id ? supabase.from("beds").select("bed_number").eq("id", admission.bed_id).maybeSingle() : { data: null },
        admission.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", admission.doctor_id).maybeSingle() : { data: null },
      ]);
      setHs(hsRes.data);
      setWard(wardRes.data);
      setBed(bedRes.data);
      setDoctor(docRes.data);
      setLoading(false);
    })();
  }, [open, admission]);

  const print = () => {
    const hn = hs?.hospital_name || "Hospital";
    const admNum = admission?.admission_number || "";
    const wName = ward?.name || "";
    const bNum = bed?.bed_number || "";
    const docName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "";
    const admDate = admission.admission_date ? format(new Date(admission.admission_date), "MMM d, yyyy HH:mm") : "";
    const today = format(new Date(), "dd/MM/yyyy");
    const now = format(new Date(), "dd/MM/yyyy HH:mm");

    const vitalsRows = (count: number) => Array.from({ length: count }, () =>
      `<tr>${Array.from({ length: 6 }, () => '<td class="vital-cell"></td>').join("")}</tr>`
    ).join("");
    const ivRows = Array.from({ length: 5 }, () =>
      `<tr>${Array.from({ length: 5 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");
    const ioRows = Array.from({ length: 5 }, () =>
      `<tr>${Array.from({ length: 4 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");

    const intraOpRows = Array.from({ length: 5 }, () =>
      `<tr>${Array.from({ length: 4 }, () => '<td class="vital-cell"></td>').join("")}</tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><title>Clinical Record Sheet</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 0; color: #000; }
      .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
      .header h2 { margin: 4px 0 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; vertical-align: middle; }
      th { font-weight: bold; text-align: center; font-size: 13px; background: transparent; }
      .info-label { font-weight: bold; width: 90px; background: #f5f5f5; font-size: 12px; }
      .blank-line { border-bottom: 1px solid #000; min-height: 32px; width: 100%; display: block; }
      .blank-sm { border-bottom: 1px solid #000; min-height: 24px; width: 100%; display: block; }
      .vital-cell { min-height: 48px; }
      .footer { text-align: center; font-size: 9px; color: #888; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 4px; }
      .sig-line { border-bottom: 1px solid #000; height: 40px; width: 220px; display: inline-block; margin-top: 6px; }
      .page-break { page-break-before: always; }
      .section-num { font-weight: bold; font-size: 12px; }
      .anesthesia-table td { padding: 4px 6px; font-size: 11px; }
    </style></head><body>
    <div class="header">
      <h1>${hn}</h1>
      <h2>Clinical Record Sheet</h2>
      <p style="margin:2px 0;font-size:11px">Admission #: ${admNum} | Patient: ${patientName}</p>
    </div>
    <table>
      <tr><td class="info-label">Ward</td><td style="width:25%"><span class="blank-line">${wName}</span></td>
          <td class="info-label">Bed</td><td style="width:25%"><span class="blank-line">${bNum}</span></td>
          <td class="info-label">Doctor</td><td><span class="blank-line">${docName}</span></td></tr>
      <tr><td class="info-label">Admitted</td><td colspan="5"><span class="blank-line">${admDate}</span></td></tr>
    </table>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="6">VITALS RECORD (Page 1 of 5)</th></tr>
      <tr>
        <th style="width:18%">Date / Time</th>
        <th style="width:14%">Temp (°C)</th>
        <th style="width:14%">Pulse (/min)</th>
        <th style="width:26%">BP (Sys / Dia)</th>
        <th style="width:14%">RR (/min)</th>
        <th style="width:14%">SpO₂ (%)</th>
      </tr>
      ${vitalsRows(5)}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="6">VITALS RECORD (Page 2 of 5)</th></tr>
      <tr>
        <th style="width:18%">Date / Time</th>
        <th style="width:14%">Temp (°C)</th>
        <th style="width:14%">Pulse (/min)</th>
        <th style="width:26%">BP (Sys / Dia)</th>
        <th style="width:14%">RR (/min)</th>
        <th style="width:14%">SpO₂ (%)</th>
      </tr>
      ${vitalsRows(5)}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="5">IV FLUIDS (Page 3 of 5)</th></tr>
      <tr>
        <th style="width:20%">Date / Time</th>
        <th style="width:25%">Fluid Type</th>
        <th style="width:18%">Volume (ml)</th>
        <th style="width:17%">Rate</th>
        <th style="width:20%">Notes</th>
      </tr>
      ${ivRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="4">ANESTHESIA NOTES FORM (Page 4 of 5)</th></tr>
      <tr><td colspan="4" style="padding:6px 8px;">
        <p class="section-num">1. Surgical Procedure</p><span class="blank-line" style="min-height:28px"></span>
        <p class="section-num" style="margin-top:6px">2. Brief Medical & Surgical History</p><span class="blank-line" style="min-height:36px"></span>
        <p class="section-num" style="margin-top:6px">3. Pre-Op Vitals</p>
        <table style="margin:4px 0"><tr><td style="border:none;padding:2px 4px;width:33%">HR: <span class="blank-sm" style="display:inline-block;width:60px"></span> bpm</td>
        <td style="border:none;padding:2px 4px;width:34%">BP: <span class="blank-sm" style="display:inline-block;width:80px"></span> mmHg</td>
        <td style="border:none;padding:2px 4px;width:33%">SpO₂: <span class="blank-sm" style="display:inline-block;width:60px"></span> %</td></tr></table>
        <p class="section-num" style="margin-top:6px">4. Pre-Op Medication</p><span class="blank-line" style="min-height:28px"></span>
        <p class="section-num" style="margin-top:6px">5. Mode of Anesthesia</p>
        <table style="margin:4px 0"><tr><td style="border:none;padding:2px 10px;width:25%">☐ Spinal</td>
        <td style="border:none;padding:2px 10px;width:30%">☐ General Anesthesia</td>
        <td style="border:none;padding:2px 10px;width:20%">☐ Local</td>
        <td style="border:none;padding:2px 10px;width:25%">☐ Sedation</td></tr></table>
        <p class="section-num" style="margin-top:6px">6. Drugs Used in Induction of Anesthesia</p><span class="blank-line" style="min-height:28px"></span>
      </td></tr>
      <tr><th style="font-size:13px;padding:6px" colspan="4">7. Intra-Op Assessment</th></tr>
      <tr>
        <th style="width:25%">Time</th>
        <th style="width:25%">HR</th>
        <th style="width:25%">SpO₂</th>
        <th style="width:25%">BP</th>
      </tr>
      ${intraOpRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="4">ANESTHESIA NOTES FORM (Page 5 of 5)</th></tr>
      <tr><td colspan="4" style="padding:6px 8px;">
        <p class="section-num">8. Input / Output During Surgery</p><span class="blank-line" style="min-height:36px"></span>
        <p class="section-num" style="margin-top:6px">9. Recovery Status</p>
        <table style="margin:4px 0"><tr><td style="border:none;padding:2px 10px;width:20%">☐ Stable</td>
        <td style="border:none;padding:2px 10px;width:20%">☐ Critical</td>
        <td style="border:none;padding:2px 10px;width:25%">☐ Shifted to ICU</td>
        <td style="border:none;padding:2px 10px;width:20%">☐ Shifted to Ward</td>
        <td style="border:none;padding:2px 10px;width:15%">☐ Under Obs.</td></tr></table>
        <p class="section-num" style="margin-top:6px">10. Post-Op Orders</p>
        <table style="margin:4px 0"><tr><td style="border:none;padding:2px 10px;width:50%">☐ Monitor Vitals</td>
        <td style="border:none;padding:2px 10px;width:50%">☐ Intake/Output Record</td></tr>
        <tr><td style="border:none;padding:2px 10px;">☐ Keep NPO for 6 hours</td>
        <td style="border:none;padding:2px 10px;">☐ Pain Management</td></tr>
        <tr><td style="border:none;padding:2px 10px;">☐ Oxygen Support</td>
        <td style="border:none;padding:2px 10px;">☐ Antibiotics Continue</td></tr></table>
        <span class="blank-line" style="min-height:28px;margin-top:4px"></span>
      </td></tr>
    </table>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="4">INTAKE / OUTPUT</th></tr>
      <tr>
        <th style="width:25%">Date / Time</th>
        <th style="width:25%">Intake (ml)</th>
        <th style="width:25%">Output (ml)</th>
        <th style="width:25%">Notes</th>
      </tr>
      ${ioRows}
    </table>
    <table>
      <tr><td style="width:50%;padding:10px 12px;border:1px solid #000">
        <strong>Nurse / Staff Signature:</strong>
        <div class="sig-line"></div>
      </td>
      <td style="width:50%;padding:10px 12px;border:1px solid #000">
        <strong>Doctor Signature:</strong>
        <div class="sig-line"></div>
      </td></tr>
      <tr><td colspan="2" style="padding:6px 10px;border:1px solid #000;font-size:11px">
        <strong>Date:</strong> ${today}
      </td></tr>
    </table>
    <div class="footer">Generated on ${now} — ${hn}</div>
    <script>window.print();</script>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md z-[9999]">
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[9999]">
        <DialogHeader>
          <DialogTitle>Print Clinical Sheet</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Prints a clinical record sheet with:
          </p>
          <ul className="text-xs text-left text-muted-foreground space-y-1 max-w-xs mx-auto">
            <li>• 10 blank Vitals rows (Time, Temp, Pulse, BP Sys/Dia, RR, SpO₂)</li>
            <li>• 5 blank IV Fluid rows</li>
            <li>• 5 blank Intake/Output rows</li>
            <li>• Signature fields for Nurse &amp; Doctor</li>
          </ul>
          <p className="text-sm font-medium">{patientName} — {admission?.admission_number}</p>
          <Button size="lg" onClick={print} className="gap-2">
            <Printer className="w-5 h-5" /> Print Clinical Sheet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
