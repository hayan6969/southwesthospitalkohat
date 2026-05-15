import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BedDouble, Banknote } from "lucide-react";
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
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("generate_admission_number");
      if (numErr) throw numErr;
      const { data: { user } } = await supabase.auth.getUser();

      // Store deposit in notes with a parseable prefix
      const notesToSave = depositAmount > 0
        ? `__DEPOSIT__:${depositAmount}\n${notes}`.trim()
        : notes || null;

      const { error } = await supabase.from("ipd_admissions").insert({
        admission_number: numData as string,
        patient_id: patientId,
        doctor_id: doctorId ?? null,
        referring_appointment_id: appointmentId ?? null,
        source: appointmentId ? "opd_referral" : "direct",
        status: "pending",
        chief_complaint: chiefComplaint || null,
        provisional_diagnosis: provisionalDiagnosis || null,
        notes: notesToSave,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(
        depositAmount > 0
          ? `Pending admission created with Rs ${depositAmount.toLocaleString()} deposit intent`
          : "Patient referred to IPD — pending admission created"
      );
      setOpen(false);
      setChiefComplaint(""); setProvisionalDiagnosis(""); setNotes(""); setDepositAmount(0);
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
          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" /> Advance Payment (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Initial Deposit (PKR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={depositAmount || ""}
                  onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This deposit intent will carry forward to admission
                </p>
              </div>
              <div className="flex items-end pb-2">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 w-full">
                  <p className="text-xs text-green-700 font-medium">Deposit Intent</p>
                  <p className="text-lg font-bold text-green-700">
                    Rs {(depositAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Referring..." : depositAmount > 0 ? `Create Pending (Rs ${depositAmount.toLocaleString()} deposit)` : "Create Pending Admission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
