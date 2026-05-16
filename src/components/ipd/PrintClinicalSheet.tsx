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
  const [profile, setProfile] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [doctorProf, setDoctorProf] = useState<any>(null);
  const [adm, setAdm] = useState<any>(null);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const { data: fresh } = await supabase
        .from("ipd_admissions")
        .select("*, beds(bed_number,daily_charge), wards(name)")
        .eq("id", admission.id)
        .maybeSingle();
      const a = fresh || admission;

      const [hsRes, profRes, patRes, docRes, docProfRes] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,hospital_address,contact_number,logo_url").maybeSingle(),
        supabase.from("profiles").select("first_name,last_name,phone").eq("id", a.patient_id).maybeSingle(),
        supabase.from("patients").select("*").eq("id", a.patient_id).maybeSingle(),
        a.doctor_id ? supabase.from("doctors").select("specialization,consultation_fee").eq("id", a.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
        a.doctor_id ? supabase.from("profiles").select("first_name,last_name").eq("id", a.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setHs(hsRes.data);
      setProfile(profRes.data);
      setPatientData(patRes.data);
      setDoctor(docRes.data);
      setDoctorProf(docProfRes.data);
      setWard(a.wards || null);
      setBed(a.beds || null);
      setAdm(a);
      setLoading(false);
    })();
  }, [open, admission]);

  const print = () => {
    const hn = hs?.hospital_name || "Hospital";
    const ha = hs?.hospital_address || "";
    const hc = hs?.contact_number || "";
    const a = adm || admission;
    const admNum = a?.admission_number || "";
    const wName = ward?.name || "";
    const bNum = bed?.bed_number || "";
    const docName = doctorProf ? `Dr. ${doctorProf.first_name} ${doctorProf.last_name}` : "";
    const docSpec = doctor?.specialization || "";
    const patPhone = profile?.phone || "";
    const patCnic = patientData?.cnic || "";
    const patDob = patientData?.date_of_birth ? format(new Date(patientData.date_of_birth), "dd/MM/yyyy") : "";
    const patBlood = patientData?.blood_type || "";
    const patCity = patientData?.city || "";
    const patAddress = patientData?.address || "";
    const patEmergName = patientData?.emergency_contact_name || "";
    const patEmergPhone = patientData?.emergency_contact_phone || "";
    const chiefComplaint = a?.chief_complaint || "";
    const provisionalDx = a?.provisional_diagnosis || "";
    const finalDx = a?.final_diagnosis || "";
    const allergies = patientData?.allergies || "";
    const patNotes = a?.notes || "";
    const patProvince = patientData?.province || "";
    const source = a?.source || "";
    const admDate = a?.admission_date ? format(new Date(a.admission_date), "dd/MM/yyyy HH:mm") : "";
    const today = format(new Date(), "dd/MM/yyyy");
    const now = format(new Date(), "dd/MM/yyyy HH:mm");

    const vitalsCell = '<td style="height:32px;padding:4px 6px;font-size:11px;border:1px solid #000;"></td>';
    const vitalsRows = (count: number) => Array.from({ length: count }, () =>
      `<tr>${Array.from({ length: 6 }, () => vitalsCell).join("")}</tr>`
    ).join("");
    const ivRows = Array.from({ length: 10 }, () =>
      `<tr>${Array.from({ length: 5 }, () => '<td style="height:50px"></td>').join("")}</tr>`
    ).join("");
    const ioRows = Array.from({ length: 10 }, () =>
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
      <h2>Clinical Record Sheet</h2>
    </div>
    <table>
      <tr><td class="lbl">Admission #</td><td style="width:23%">${admNum}</td>
          <td class="lbl" style="width:80px">Date</td><td style="width:23%">${admDate}</td>
          <td class="lbl" style="width:70px">Status</td><td>${a?.status || ""}</td></tr>
      <tr><td class="lbl">Ward</td><td>${wName}</td>
          <td class="lbl">Bed #</td><td>${bNum}</td>
          <td class="lbl">Source</td><td>${source}</td></tr>
      <tr><td class="lbl">Consultant</td><td colspan="2">${docName}</td>
          <td class="lbl">Specialization</td><td colspan="2">${docSpec}</td></tr>
    </table>
    <table>
      <tr><td class="section-title" colspan="6">PATIENT INFORMATION</td></tr>
      <tr><td class="lbl">Patient Name</td><td style="width:23%">${patientName}</td>
          <td class="lbl" style="width:80px">Phone</td><td colspan="3">${patPhone}</td></tr>
      <tr><td class="lbl">CNIC</td><td>${patCnic}</td>
          <td class="lbl">DOB</td><td>${patDob}</td>
          <td class="lbl">Blood</td><td>${patBlood}</td></tr>
      <tr><td class="lbl">City</td><td>${patCity}</td>
          <td class="lbl">Province</td><td>${patProvince}</td>
          <td class="lbl">Address</td><td>${patAddress}</td></tr>
      ${patEmergName ? `<tr><td class="lbl">Emergency Contact</td><td>${patEmergName}</td>
          <td class="lbl">Phone</td><td colspan="3">${patEmergPhone}</td></tr>` : ""}
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
      <tr><th style="font-size:14px;padding:8px" colspan="6">VITALS RECORD (Page 1 of 4)</th></tr>
      <tr>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Temp (°C)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">Pulse (/min)</th>
        <th style="width:26%;padding:6px 4px;font-size:12px;">BP (Sys / Dia)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">RR (/min)</th>
        <th style="width:14%;padding:6px 4px;font-size:12px;">SpO₂ (%)</th>
      </tr>
      ${vitalsRows(12)}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="5">IV FLUIDS (Page 2 of 4)</th></tr>
      <tr>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Date / Time</th>
        <th style="width:25%;padding:6px 4px;font-size:12px;">Fluid Type</th>
        <th style="width:18%;padding:6px 4px;font-size:12px;">Volume (ml)</th>
        <th style="width:17%;padding:6px 4px;font-size:12px;">Rate</th>
        <th style="width:20%;padding:6px 4px;font-size:12px;">Notes</th>
      </tr>
      ${ivRows}
    </table>
    <div class="page-break"></div>
    <table>
      <tr><th style="font-size:14px;padding:8px" colspan="4">INTAKE / OUTPUT (Page 3 of 4)</th></tr>
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
            <li>• 12 blank Vitals rows on 1 page</li>
            <li>• 10 blank IV Fluid rows</li>
            <li>• 10 blank Intake/Output rows</li>
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
