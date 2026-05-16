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

    const vitalsRows = Array.from({ length: 8 }, () =>
      `<tr>${Array.from({ length: 6 }, () => '<td class="vital-cell"></td>').join("")}</tr>`
    ).join("");
    const ivRows = Array.from({ length: 6 }, () =>
      `<tr>${Array.from({ length: 5 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");
    const ioRows = Array.from({ length: 6 }, () =>
      `<tr>${Array.from({ length: 4 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><title>Clinical Record Sheet</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 0; color: #000; }
      .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .header h1 { margin: 0; font-size: 22px; font-weight: bold; }
      .header h2 { margin: 6px 0 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      td, th { border: 1px solid #000; padding: 10px 12px; font-size: 13px; vertical-align: middle; }
      th { font-weight: bold; text-align: center; font-size: 14px; background: transparent; }
      .info-label { font-weight: bold; width: 95px; background: #f5f5f5; font-size: 13px; }
      .blank-line { border-bottom: 1px solid #000; min-height: 38px; width: 100%; display: block; }
      .vital-cell { min-height: 55px; }
      .footer { text-align: center; font-size: 10px; color: #888; margin-top: 14px; border-top: 1px solid #ccc; padding-top: 6px; }
      .sig-line { border-bottom: 1px solid #000; height: 48px; width: 250px; display: inline-block; margin-top: 8px; }
      .page-break { page-break-before: always; }
    </style></head><body>
    <div class="header">
      <h1>${hn}</h1>
      <h2>Clinical Record Sheet</h2>
      <p style="margin:2px 0;font-size:12px">Admission #: ${admNum} | Patient: ${patientName}</p>
    </div>
    <table>
      <tr><td class="info-label">Ward</td><td style="width:25%"><span class="blank-line">${wName}</span></td>
          <td class="info-label">Bed</td><td style="width:25%"><span class="blank-line">${bNum}</span></td>
          <td class="info-label">Doctor</td><td><span class="blank-line">${docName}</span></td></tr>
      <tr><td class="info-label">Admitted</td><td colspan="5"><span class="blank-line">${admDate}</span></td></tr>
    </table>
    <table>
      <tr><th style="font-size:15px;padding:10px" colspan="6">VITALS RECORD</th></tr>
      <tr>
        <th style="width:18%">Date / Time</th>
        <th style="width:14%">Temp (°C)</th>
        <th style="width:14%">Pulse (/min)</th>
        <th style="width:26%">BP (Sys / Dia)</th>
        <th style="width:14%">RR (/min)</th>
        <th style="width:14%">SpO₂ (%)</th>
      </tr>
      ${vitalsRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:15px;padding:10px" colspan="5">IV FLUIDS</th></tr>
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
      <tr><th style="font-size:15px;padding:10px" colspan="4">INTAKE / OUTPUT</th></tr>
      <tr>
        <th style="width:25%">Date / Time</th>
        <th style="width:25%">Intake (ml)</th>
        <th style="width:25%">Output (ml)</th>
        <th style="width:25%">Notes</th>
      </tr>
      ${ioRows}
    </table>
    <table>
      <tr><td style="width:50%;padding:12px 14px;border:1px solid #000">
        <strong>Nurse / Staff Signature:</strong>
        <div class="sig-line"></div>
      </td>
      <td style="width:50%;padding:12px 14px;border:1px solid #000">
        <strong>Doctor Signature:</strong>
        <div class="sig-line"></div>
      </td></tr>
      <tr><td colspan="2" style="padding:8px 12px;border:1px solid #000;font-size:11px">
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
