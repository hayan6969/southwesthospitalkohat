import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
  onDischarged: () => void;
}

export function DischargeWithSummaryDialog({ open, onOpenChange, admission, patientName, onDischarged }: Props) {
  const [saving, setSaving] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState(admission?.final_diagnosis || "");
  const [investigation, setInvestigation] = useState("");
  const [paExam, setPaExam] = useState("");
  const [uaExam, setUaExam] = useState("");
  const [procedure, setProcedure] = useState("");
  const [treatment, setTreatment] = useState("");
  const [complication, setComplication] = useState("");
  const [conditionOfDischarge, setConditionOfDischarge] = useState("");
  const [adviceForHome, setAdviceForHome] = useState("");

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ipd_admissions").update({
        status: "discharged",
        discharge_date: new Date().toISOString(),
        final_diagnosis: finalDiagnosis || null,
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
      toast.success("Patient discharged");
      onDischarged();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to discharge");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Discharge Patient — {admission?.admission_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">{patientName}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Final Diagnosis</Label>
            <Input value={finalDiagnosis} onChange={e => setFinalDiagnosis(e.target.value)} placeholder="Enter final diagnosis" />
          </div>
          <div>
            <Label>Investigation</Label>
            <Input value={investigation} onChange={e => setInvestigation(e.target.value)} placeholder="e.g. CBC, X-ray, Ultrasound" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>P/A (Per Abdomen)</Label>
              <Input value={paExam} onChange={e => setPaExam(e.target.value)} placeholder="Examination findings" />
            </div>
            <div>
              <Label>U/A (General Exam)</Label>
              <Input value={uaExam} onChange={e => setUaExam(e.target.value)} placeholder="Examination findings" />
            </div>
          </div>
          <div>
            <Label>Procedure Performed</Label>
            <Input value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="e.g. Appendectomy" />
          </div>
          <div>
            <Label>Treatment Given</Label>
            <Textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2} placeholder="Describe treatment provided" />
          </div>
          <div>
            <Label>Complication (if any)</Label>
            <Input value={complication} onChange={e => setComplication(e.target.value)} placeholder="None" />
          </div>
          <div>
            <Label>Condition on Discharge</Label>
            <Input value={conditionOfDischarge} onChange={e => setConditionOfDischarge(e.target.value)} placeholder="e.g. Stable, Improved" />
          </div>
          <div>
            <Label>Advice for Home</Label>
            <Textarea value={adviceForHome} onChange={e => setAdviceForHome(e.target.value)} rows={2} placeholder="Follow-up, medications, diet, etc." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Discharge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
