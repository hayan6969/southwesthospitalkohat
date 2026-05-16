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

    const vitalsCell = '<td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;"></td>';
    const vitalsRows = (count: number) => Array.from({ length: count }, () =>
      `<tr>${Array.from({ length: 6 }, () => vitalsCell).join("")}</tr>`
    ).join("");
    const ivRows = Array.from({ length: 5 }, () =>
      `<tr>${Array.from({ length: 5 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");
    const ioRows = Array.from({ length: 5 }, () =>
      `<tr>${Array.from({ length: 4 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");

    const intraOpRow = (i: number) => `<tr>
      <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
      <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
      <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
      <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
    </tr>`;

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
      <tr><th style="font-size:14px;padding:8px" colspan="6">VITALS RECORD (Page 1 of 3)</th></tr>
      <tr>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Temp (°C)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Pulse (/min)</th>
        <th style="width:26%;padding:6px 4px;font-size:12px;">BP (Sys / Dia)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">RR (/min)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">SpO₂ (%)</th>
      </tr>
      ${vitalsRows(10)}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="5">IV FLUIDS (Page 2 of 3)</th></tr>
      <tr>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Fluid Type</th>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Volume (ml)</th>
        <th style="width:17%;padding:6px 4px;font-size:12px;">Rate</th>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Notes</th>
      </tr>
      ${ivRows}
    </table>
    <table style="margin-top:6px;">
      <tr><th style="font-size:14px;padding:8px" colspan="4">INTAKE / OUTPUT</th></tr>
      <tr>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Intake (ml)</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Output (ml)</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Notes</th>
      </tr>
      ${ioRows}
    </table>
    <div class="page-break"></div>
    <div style="font-family:'Courier New',monospace;font-size:11px;padding:6px;">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:bold;">SOUTH WEST HEALTH COMPLEX KOHAT</div>
        <div style="font-size:10px;">Address: Opposite Millennium Guest House, Pindi Road Kohat</div>
        <div style="font-size:13px;font-weight:bold;margin-top:8px;border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;">ANAESTHESIA NOTES</div>
      </div>
      <table style="width:100%;margin-bottom:8px;">
        <tr>
          <td style="border:none;padding:1px 2px;width:45%;font-size:11px;">Pt's Name: <span class="blank-line" style="display:inline-block;width:200px;min-height:18px;"></span></td>
          <td style="border:none;padding:1px 2px;width:18%;font-size:11px;">Age: <span class="blank-line" style="display:inline-block;width:50px;min-height:18px;"></span></td>
          <td style="border:none;padding:1px 2px;width:17%;font-size:11px;">Gender: <span class="blank-line" style="display:inline-block;width:50px;min-height:18px;"></span></td>
          <td style="border:none;padding:1px 2px;width:20%;font-size:11px;">Date: <span class="blank-line" style="display:inline-block;width:70px;min-height:18px;"></span></td>
        </tr>
      </table>

      <div style="margin-top:6px;"><strong>1. Surgical Procedure:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:22px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:22px;width:100%;margin:0 0 4px 0;"></div>

      <div style="margin-top:4px;"><strong>2. Brief Medical and Surgical History:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0 4px 0;"></div>

      <div style="margin-top:4px;"><strong>3. Pre OP Vitals:</strong></div>
      <div style="font-size:11px;margin:2px 0 4px 0;">
        H.R <span class="blank-line" style="display:inline-block;width:60px;min-height:16px;"></span> &nbsp;&nbsp;&nbsp;&nbsp;
        B.P <span class="blank-line" style="display:inline-block;width:60px;min-height:16px;"></span> &nbsp;&nbsp;&nbsp;&nbsp;
        SPO2 <span class="blank-line" style="display:inline-block;width:60px;min-height:16px;"></span>
      </div>

      <div style="margin-top:4px;"><strong>4. Pre OP Medication:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0 4px 0;"></div>

      <div style="margin-top:4px;"><strong>5. Mode of Anaesthesia:</strong></div>
      <div style="font-size:11px;margin:2px 0 4px 0;">
        [&nbsp;&nbsp;] Spinal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        [&nbsp;&nbsp;] General Anaesthesia &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        [&nbsp;&nbsp;] Local &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        [&nbsp;&nbsp;] Sedation
      </div>

      <div style="margin-top:4px;"><strong>6. Drugs used in Induction of Anaesthesia:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0 4px 0;"></div>

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
        ${Array.from({ length: 5 }, (_, i) => `<tr>
          <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
          <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
          <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
          <td style="border:1px solid #000;padding:8px 4px;font-size:10px;">&nbsp;</td>
        </tr>`).join("")}
      </table>

      <div style="margin-top:2px;"><strong>Input / Output record during Surgery:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0 4px 0;"></div>

      <div style="margin-top:2px;"><strong>Recovery Status:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:18px;width:100%;margin:2px 0 4px 0;"></div>

      <div style="margin-top:2px;"><strong>Post OP Orders:</strong></div>
      <div style="font-size:10px;margin:2px 0;display:flex;flex-wrap:wrap;">
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Monitor Vitals</div>
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Intake / Output Record</div>
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Keep NPO for 06 Hours</div>
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Keep Pain Free</div>
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Oxygen Support</div>
        <div style="width:48%;padding:1px 0;">[&nbsp;&nbsp;] Antibiotics Continue</div>
      </div>

      <div style="margin-top:4px;"><strong>Additional Notes:</strong></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0;"></div>
      <div style="border-bottom:1px solid #000;min-height:16px;width:100%;margin:2px 0 6px 0;"></div>

      <div style="margin-top:6px;border-top:1px solid #000;padding-top:4px;font-size:11px;">
        Doctor / Anaesthetist Signature: <span class="blank-line" style="display:inline-block;width:220px;min-height:20px;"></span>
      </div>
      <div style="font-size:11px;margin-top:4px;">
        Date &amp; Time: <span class="blank-line" style="display:inline-block;width:180px;min-height:20px;"></span>
      </div>
    </div>
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
            <li>• 10 blank Vitals rows on 1 page</li>
            <li>• 5 blank IV Fluid rows</li>
            <li>• 5 blank Intake/Output rows</li>
            <li>• Anaesthesia Notes form (10 sections)</li>
            <li>• Doctor/Anaesthetist signature</li>
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
