import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  patientId: string;
  doctorId?: string | null;
  appointmentId?: string | null;
  trigger?: React.ReactNode;
  onReferred?: () => void;
}

export function ReferToIPDDialog({ patientId, doctorId, appointmentId, trigger, onReferred }: Props) {
  const [open, setOpen] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("generate_admission_number");
      if (numErr) throw numErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ipd_admissions").insert({
        admission_number: numData as string,
        patient_id: patientId,
        doctor_id: doctorId ?? null,
        referring_appointment_id: appointmentId ?? null,
        source: appointmentId ? "opd_referral" : "direct",
        status: "pending",
        chief_complaint: chiefComplaint || null,
        provisional_diagnosis: provisionalDiagnosis || null,
        notes: notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Patient referred to IPD — pending admission created");
      setOpen(false);
      setChiefComplaint(""); setProvisionalDiagnosis(""); setNotes("");
      onReferred?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to refer to IPD");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <BedDouble className="w-3.5 h-3.5" /> Refer to IPD
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Refer Patient to IPD</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Chief Complaint</Label>
            <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g. Severe abdominal pain" />
          </div>
          <div>
            <Label>Provisional Diagnosis</Label>
            <Input value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)} placeholder="e.g. Acute appendicitis" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Referring..." : "Create Pending Admission"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
