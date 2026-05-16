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
    const html = document.getElementById("clinical-sheet-print")?.outerHTML || "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Clinical Record Sheet</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
      .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .header h1 { margin: 0; font-size: 18px; }
      .header h2 { margin: 4px 0 0; font-size: 14px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      td, th { border: 1px solid #000; padding: 4px 6px; font-size: 10px; vertical-align: top; }
      th { background: transparent; color: #000; font-weight: bold; text-align: center; }
      .info-label { font-weight: bold; width: 80px; }
      .blank-line { border-bottom: 1px solid #000; min-height: 20px; width: 100%; display: block; }
      .vital-cell { min-height: 22px; }
      .footer { text-align: center; font-size: 9px; color: #888; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px; }
      .sig-line { border-bottom: 1px solid #000; height: 30px; width: 200px; display: inline-block; margin-top: 5px; }
    </style></head><body>${html}
    <script>window.print();</script></body></html>`);
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
            Print a blank clinical record sheet for <strong>{patientName}</strong> ({admission?.admission_number})
          </p>
          <Button size="lg" onClick={print} className="gap-2">
            <Printer className="w-5 h-5" /> Print Clinical Sheet
          </Button>
        </div>

        <div id="clinical-sheet-print" style={{ display: "none" }}>
          <div class="header">
            <h1>{hs?.hospital_name || "Hospital"}</h1>
            <h2>Clinical Record Sheet</h2>
            <p style={{ margin: "2px 0", fontSize: 11 }}>Admission #: {admission?.admission_number} | Patient: {patientName}</p>
          </div>

          <table class="info-table">
            <tr><td class="info-label">Ward</td><td style={{ width: "25%" }}><span class="blank-line">{ward?.name || ""}</span></td>
                <td class="info-label">Bed</td><td style={{ width: "25%" }}><span class="blank-line">{bed?.bed_number || ""}</span></td>
                <td class="info-label">Doctor</td><td><span class="blank-line">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : ""}</span></td></tr>
            <tr><td class="info-label">Admitted</td><td colspan="5"><span class="blank-line">{admission.admission_date ? format(new Date(admission.admission_date), "MMM d, yyyy HH:mm") : ""}</span></td></tr>
          </table>

          <table>
            <tr><th colspan="7">VITALS RECORD</th></tr>
            <tr>
              <th style={{ width: "14%" }}>Date / Time</th>
              <th style={{ width: "14%" }}>Temp (°C)</th>
              <th style={{ width: "14%" }}>Pulse (/min)</th>
              <th style={{ width: "14%" }}>BP Systolic</th>
              <th style={{ width: "14%" }}>BP Diastolic</th>
              <th style={{ width: "14%" }}>RR (/min)</th>
              <th style={{ width: "14%" }}>SpO₂ (%)</th>
            </tr>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} class="vital-cell"></td>))}</tr>
            ))}
          </table>

          <table>
            <tr><th colspan="5">IV FLUIDS</th></tr>
            <tr>
              <th style={{ width: "20%" }}>Date / Time</th>
              <th style={{ width: "25%" }}>Fluid Type</th>
              <th style={{ width: "18%" }}>Volume (ml)</th>
              <th style={{ width: "17%" }}>Rate</th>
              <th style={{ width: "20%" }}>Notes</th>
            </tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (<td key={j} style={{ height: 22 }}></td>))}</tr>
            ))}
          </table>

          <table>
            <tr><th colspan="4">INTAKE / OUTPUT</th></tr>
            <tr>
              <th style={{ width: "25%" }}>Date / Time</th>
              <th style={{ width: "25%" }}>Intake (ml)</th>
              <th style={{ width: "25%" }}>Output (ml)</th>
              <th style={{ width: "25%" }}>Notes</th>
            </tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (<td key={j} style={{ height: 22 }}></td>))}</tr>
            ))}
          </table>

          <table>
            <tr><td style={{ width: "50%", padding: "8px 10px", border: "1px solid #000" }}>
              <strong>Nurse / Staff Signature:</strong>
              <div class="sig-line"></div>
            </td>
            <td style={{ width: "50%", padding: "8px 10px", border: "1px solid #000" }}>
              <strong>Doctor Signature:</strong>
              <div class="sig-line"></div>
            </td></tr>
            <tr><td colspan="2" style={{ padding: "6px 10px", border: "1px solid #000", fontSize: 10 }}>
              <strong>Date:</strong> {format(new Date(), "dd/MM/yyyy")}
            </td></tr>
          </table>

          <div class="footer">Generated on {format(new Date(), "dd/MM/yyyy HH:mm")} — {hs?.hospital_name || "Hospital"}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
