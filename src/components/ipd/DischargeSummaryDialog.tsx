import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Printer, Edit3, Save } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
}

export function DischargeSummaryDialog({ open, onOpenChange, admission, patientName }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<any>(null);
  // Editable fields
  const [investigation, setInvestigation] = useState("");
  const [paExam, setPaExam] = useState("");
  const [uaExam, setUaExam] = useState("");
  const [procedure, setProcedure] = useState("");
  const [treatment, setTreatment] = useState("");
  const [complication, setComplication] = useState("");
  const [conditionOfDischarge, setConditionOfDischarge] = useState("");
  const [adviceForHome, setAdviceForHome] = useState("");

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const [admRes, profRes, patRes, chartRes, medRes, labRes] = await Promise.all([
        supabase
          .from("ipd_admissions")
          .select("*, beds(bed_number), wards(name)")
          .eq("id", admission.id)
          .maybeSingle(),
        supabase.from("profiles").select("first_name,last_name,phone,email").eq("id", admission.patient_id).maybeSingle(),
        supabase.from("patients").select("*").eq("id", admission.patient_id).maybeSingle(),
        supabase.from("ipd_treatment_chart").select("*").eq("admission_id", admission.id).order("recorded_at", { ascending: false }),
        supabase.from("ipd_medicine_orders").select("*").eq("admission_id", admission.id).order("created_at", { ascending: false }),
        supabase.from("ipd_lab_orders").select("*").eq("admission_id", admission.id).order("created_at", { ascending: false }),
      ]);
      setData({ admission: admRes.data, profile: profRes.data, patient: patRes.data, chart: chartRes.data ?? [], medicines: medRes.data ?? [], labs: labRes.data ?? [] });
      const a = admRes.data;
      setInvestigation(a?.investigation || "");
      setPaExam(a?.pa_exam || "");
      setUaExam(a?.ua_exam || "");
      setProcedure(a?.procedure_performed || "");
      setTreatment(a?.treatment_given || "");
      setComplication(a?.complication || "");
      setConditionOfDischarge(a?.condition_of_discharge || "");
      setAdviceForHome(a?.advice_for_home || "");
      setLoading(false);
    })();
  }, [open, admission]);

  const calcAge = (dob: string) => {
    if (!dob) return null;
    return differenceInYears(new Date(), new Date(dob));
  };

  const saveDischargeFields = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("ipd_admissions").update({
        investigation: investigation || null,
        pa_exam: paExam || null,
        ua_exam: uaExam || null,
        procedure_performed: procedure || null,
        treatment_given: treatment || null,
        complication: complication || null,
        condition_of_discharge: conditionOfDischarge || null,
        advice_for_home: adviceForHome || null,
      }).eq("id", admission.id);
      if (error) throw error;
      toast.success("Discharge summary updated");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const print = () => {
    const html = document.getElementById("discharge-summary-content")?.outerHTML || "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Discharge Summary</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
      .container { max-width: 190mm; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .header h1 { margin: 0; font-size: 20px; }
      .header h2 { margin: 6px 0 0; font-size: 15px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      td, th { border: 1px solid #000; padding: 5px 7px; font-size: 11px; vertical-align: top; }
      th { background: transparent; color: #000; text-align: center; font-weight: bold; font-size: 12px; padding: 5px 7px; }
      .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .lbl { font-weight: bold; width: 120px; background: #f5f5f5; }
    </style></head><body><div class="container">${html}</div>
    <script>window.print();</script></body></html>`);
    w.document.close();
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

  const adm = data?.admission || admission;
  const profile = data?.profile;
  const patient = data?.patient;
  const chart = data?.chart || [];
  const vitals = chart.filter((e: any) => e.entry_type === "vitals");
  const ivFluids = chart.filter((e: any) => e.entry_type === "iv_fluid");
  const intakeOutput = chart.filter((e: any) => e.entry_type === "intake_output");
  const doctorNotes = chart.filter((e: any) => e.entry_type === "doctor_note");
  const medicines = data?.medicines || [];
  const labs = data?.labs || [];
  const age = patient?.date_of_birth ? calcAge(patient.date_of_birth) : null;
  const days = adm?.admission_date && adm?.discharge_date
    ? Math.max(1, Math.ceil((new Date(adm.discharge_date).getTime() - new Date(adm.admission_date).getTime()) / 86400000))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Discharge Summary — {adm?.admission_number}</DialogTitle>
          <div className="flex gap-2">
            {editing ? (
              <Button size="sm" onClick={saveDischargeFields} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit3 className="w-4 h-4 mr-1" />Edit</Button>
            )}
            <Button size="sm" variant="outline" onClick={print}><Printer className="w-4 h-4 mr-1" />Print</Button>
          </div>
        </DialogHeader>
        <div id="discharge-summary-content" style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#000" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 14 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>Discharge Summary</h1>
            <h2 style={{ margin: "6px 0 0", fontSize: 15, textTransform: "uppercase" }}>IPD Discharge Report</h2>
          </div>

          <table cellPadding={0} cellSpacing={0}>
            <tr><th colSpan={6}>ADMISSION DETAILS</th></tr>
            <tr>
              <td className="lbl">Admission #</td><td>{adm?.admission_number || "—"}</td>
              <td className="lbl">Status</td><td>{adm?.status || "—"}</td>
              <td className="lbl">Source</td><td>{adm?.source || "—"}</td>
            </tr>
            <tr>
              <td className="lbl">Admitted</td><td>{adm?.admission_date ? format(new Date(adm.admission_date), "dd/MM/yyyy HH:mm") : "—"}</td>
              <td className="lbl">Discharged</td><td>{adm?.discharge_date ? format(new Date(adm.discharge_date), "dd/MM/yyyy HH:mm") : "—"}</td>
              <td className="lbl">Stay</td><td>{days} day(s)</td>
            </tr>
            <tr>
              <td className="lbl">Ward</td><td>{adm?.wards?.name || "—"}</td>
              <td className="lbl">Bed</td><td>{adm?.beds?.bed_number || "—"}</td>
              <td className="lbl">Doctor</td><td>{profile?.first_name ? `Dr. ${profile.first_name} ${profile.last_name}` : "—"}</td>
            </tr>
          </table>

          <table cellPadding={0} cellSpacing={0}>
            <tr><th colSpan={6}>PATIENT INFORMATION</th></tr>
            <tr>
              <td className="lbl">Patient Name</td><td>{patientName}</td>
              <td className="lbl">Age / DOB</td><td>{age !== null ? `${age} yrs` : ""}{patient?.date_of_birth ? ` (${format(new Date(patient.date_of_birth), "dd/MM/yyyy")})` : "—"}</td>
              <td className="lbl">Gender</td><td>—</td>
            </tr>
            <tr>
              <td className="lbl">CNIC</td><td>{patient?.cnic || "—"}</td>
              <td className="lbl">Phone</td><td>{profile?.phone || "—"}</td>
              <td className="lbl">Blood Group</td><td>{patient?.blood_type || "—"}</td>
            </tr>
            <tr>
              <td className="lbl">Address</td><td colSpan={5}>{patient?.address || "—"}</td>
            </tr>
          </table>

          <table cellPadding={0} cellSpacing={0}>
            <tr><th colSpan={2}>MEDICAL INFORMATION</th></tr>
            <tr><td className="lbl">Chief Complaint</td><td>{adm?.chief_complaint || "—"}</td></tr>
            <tr><td className="lbl">Provisional Diagnosis</td><td>{adm?.provisional_diagnosis || "—"}</td></tr>
            <tr><td className="lbl">Final Diagnosis</td><td>{adm?.final_diagnosis || "—"}</td></tr>
            <tr><td className="lbl">Investigation</td><td>{editing ? <Input value={investigation} onChange={e => setInvestigation(e.target.value)} className="h-8 text-xs" /> : investigation || "—"}</td></tr>
            <tr><td className="lbl">P/A</td><td>{editing ? <Input value={paExam} onChange={e => setPaExam(e.target.value)} className="h-8 text-xs" /> : paExam || "—"}</td></tr>
            <tr><td className="lbl">U/A</td><td>{editing ? <Input value={uaExam} onChange={e => setUaExam(e.target.value)} className="h-8 text-xs" /> : uaExam || "—"}</td></tr>
            <tr><td className="lbl">Procedure</td><td>{editing ? <Input value={procedure} onChange={e => setProcedure(e.target.value)} className="h-8 text-xs" /> : procedure || "—"}</td></tr>
            <tr><td className="lbl">Treatment</td><td>{editing ? <Textarea value={treatment} onChange={e => setTreatment(e.target.value)} className="h-16 text-xs" /> : treatment || "—"}</td></tr>
            <tr><td className="lbl">Complication</td><td>{editing ? <Input value={complication} onChange={e => setComplication(e.target.value)} className="h-8 text-xs" /> : complication || "—"}</td></tr>
            <tr><td className="lbl">Condition of Discharge</td><td>{editing ? <Input value={conditionOfDischarge} onChange={e => setConditionOfDischarge(e.target.value)} className="h-8 text-xs" /> : conditionOfDischarge || "—"}</td></tr>
            <tr><td className="lbl">Advice for Home</td><td>{editing ? <Textarea value={adviceForHome} onChange={e => setAdviceForHome(e.target.value)} className="h-16 text-xs" /> : adviceForHome || "—"}</td></tr>
            {adm?.notes && <tr><td className="lbl">Notes</td><td>{adm.notes}</td></tr>}
          </table>

          {vitals.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={7}>VITALS RECORD</th></tr>
              <tr>
                <th style={{ padding: 3 }}>Date/Time</th>
                <th style={{ padding: 3 }}>Temp</th>
                <th style={{ padding: 3 }}>Pulse</th>
                <th style={{ padding: 3 }}>BP</th>
                <th style={{ padding: 3 }}>RR</th>
                <th style={{ padding: 3 }}>SpO₂</th>
                <th style={{ padding: 3 }}>Notes</th>
              </tr>
              {vitals.slice(0, 10).map((v: any) => (
                <tr key={v.id}>
                  <td style={{ padding: 3 }}>{format(new Date(v.recorded_at), "MMM d HH:mm")}</td>
                  <td style={{ padding: 3 }}>{v.temperature ?? "—"}</td>
                  <td style={{ padding: 3 }}>{v.pulse ?? "—"}</td>
                  <td style={{ padding: 3 }}>{v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : "—"}</td>
                  <td style={{ padding: 3 }}>{v.respiratory_rate ?? "—"}</td>
                  <td style={{ padding: 3 }}>{v.oxygen_saturation ?? "—"}</td>
                  <td style={{ padding: 3 }}>{v.notes ?? "—"}</td>
                </tr>
              ))}
            </table>
          )}

          {doctorNotes.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={2}>DOCTOR NOTES</th></tr>
              {doctorNotes.slice(0, 5).map((n: any) => (
                <tr key={n.id}>
                  <td style={{ fontSize: 10, width: 120 }}>{format(new Date(n.recorded_at), "MMM d HH:mm")}</td>
                  <td style={{ fontSize: 10 }}>{n.notes || "—"}</td>
                </tr>
              ))}
            </table>
          )}

          {ivFluids.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={5}>IV FLUIDS ADMINISTERED</th></tr>
              <tr>
                <th style={{ padding: 3 }}>Date/Time</th>
                <th style={{ padding: 3 }}>Fluid Type</th>
                <th style={{ padding: 3 }}>Volume</th>
                <th style={{ padding: 3 }}>Rate</th>
                <th style={{ padding: 3 }}>Notes</th>
              </tr>
              {ivFluids.slice(0, 10).map((v: any) => (
                <tr key={v.id}>
                  <td style={{ padding: 3 }}>{format(new Date(v.recorded_at), "MMM d HH:mm")}</td>
                  <td style={{ padding: 3 }}>{v.fluid_type || "—"}</td>
                  <td style={{ padding: 3 }}>{v.fluid_volume_ml ? `${v.fluid_volume_ml} ml` : "—"}</td>
                  <td style={{ padding: 3 }}>{v.fluid_rate || "—"}</td>
                  <td style={{ padding: 3 }}>{v.notes || "—"}</td>
                </tr>
              ))}
            </table>
          )}

          {intakeOutput.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={4}>INTAKE / OUTPUT RECORD</th></tr>
              <tr>
                <th style={{ padding: 3 }}>Date/Time</th>
                <th style={{ padding: 3 }}>Intake (ml)</th>
                <th style={{ padding: 3 }}>Output (ml)</th>
                <th style={{ padding: 3 }}>Notes</th>
              </tr>
              {intakeOutput.slice(0, 10).map((io: any) => (
                <tr key={io.id}>
                  <td style={{ padding: 3 }}>{format(new Date(io.recorded_at), "MMM d HH:mm")}</td>
                  <td style={{ padding: 3 }}>{io.intake_ml ?? "—"}</td>
                  <td style={{ padding: 3 }}>{io.output_ml ?? "—"}</td>
                  <td style={{ padding: 3 }}>{io.notes || "—"}</td>
                </tr>
              ))}
            </table>
          )}

          {medicines.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={6}>MEDICINE ORDERS</th></tr>
              <tr>
                <th style={{ padding: 3 }}>Date</th>
                <th style={{ padding: 3 }}>Medicine</th>
                <th style={{ padding: 3 }}>Dosage</th>
                <th style={{ padding: 3 }}>Frequency</th>
                <th style={{ padding: 3 }}>Route</th>
                <th style={{ padding: 3 }}>Status</th>
              </tr>
              {medicines.slice(0, 10).map((m: any) => (
                <tr key={m.id}>
                  <td style={{ padding: 3 }}>{format(new Date(m.created_at), "MMM d")}</td>
                  <td style={{ padding: 3 }}>{m.medicine_name}</td>
                  <td style={{ padding: 3 }}>{m.dosage || "—"}</td>
                  <td style={{ padding: 3 }}>{m.frequency || "—"}</td>
                  <td style={{ padding: 3 }}>{m.route || "—"}</td>
                  <td style={{ padding: 3 }}>{m.status}</td>
                </tr>
              ))}
            </table>
          )}

          {labs.length > 0 && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th colSpan={4}>LAB TESTS</th></tr>
              <tr>
                <th style={{ padding: 3 }}>Date</th>
                <th style={{ padding: 3 }}>Test</th>
                <th style={{ padding: 3 }}>Result</th>
                <th style={{ padding: 3 }}>Status</th>
              </tr>
              {labs.slice(0, 10).map((l: any) => (
                <tr key={l.id}>
                  <td style={{ padding: 3 }}>{format(new Date(l.created_at), "MMM d")}</td>
                  <td style={{ padding: 3 }}>{l.test_name}</td>
                  <td style={{ padding: 3 }}>{l.result_notes || "—"}</td>
                  <td style={{ padding: 3 }}>{l.status}</td>
                </tr>
              ))}
            </table>
          )}

          {patient?.allergies && (
            <table cellPadding={0} cellSpacing={0}>
              <tr><th>ALLERGIES</th></tr>
              <tr><td style={{ padding: "5px 7px" }}>{patient.allergies}</td></tr>
            </table>
          )}

          <div style={{ textAlign: "center", fontSize: 9, color: "#888", marginTop: 12, borderTop: "1px solid #ccc", paddingTop: 6 }}>
            Generated on {format(new Date(), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
