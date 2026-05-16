import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BedDouble, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatPkrAmount } from "@/utils/currency";

interface Props {
  patientId: string;
  doctorId?: string | null;
  appointmentId?: string | null;
  trigger?: React.ReactNode;
  onReferred?: () => void;
}

export function ReferToIPDDialog({ patientId, doctorId, appointmentId, trigger, onReferred }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [doctorFee, setDoctorFee] = useState(0);
  const [anesthesiaFee, setAnesthesiaFee] = useState(0);
  const [otaFee, setOtaFee] = useState(0);
  const [otCharges, setOtCharges] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const totalUpfront = doctorFee + anesthesiaFee + otaFee + otCharges;

  const submit = async () => {
    if (submitting) return;
    if (totalUpfront > 0 && paymentAmount <= 0) { toast.error("Enter payment amount to collect charges"); return; }
    setSubmitting(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("generate_admission_number");
      if (numErr) throw numErr;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: admissionData, error: admErr } = await supabase.from("ipd_admissions").insert({
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
      }).select("id").single();
      if (admErr) throw admErr;

      // Create invoice if charges are being collected
      if (totalUpfront > 0 && paymentAmount > 0) {
        const { data: invNum } = await supabase.rpc("generate_ipd_invoice_number");
        const { data: invData, error: invErr } = await supabase.from("ipd_invoices").insert({
          invoice_number: invNum as string,
          admission_id: admissionData.id,
          patient_id: patientId,
          paid_amount: paymentAmount,
        }).select("id").single();
        if (invErr) throw invErr;

        const chargeRows: { charge_type: string; description: string; amount: number }[] = [];
        if (doctorFee > 0) chargeRows.push({ charge_type: "doctor", description: "Doctor fees", amount: doctorFee });
        if (anesthesiaFee > 0) chargeRows.push({ charge_type: "anesthesia", description: "Anesthesia/Anesthetist fees", amount: anesthesiaFee });
        if (otaFee > 0) chargeRows.push({ charge_type: "ota", description: "OT Assistant fees", amount: otaFee });
        if (otCharges > 0) chargeRows.push({ charge_type: "ot", description: "Operation Theatre charges", amount: otCharges });

        if (chargeRows.length > 0) {
          const { error: chgErr } = await supabase.from("ipd_charges").insert(
            chargeRows.map(c => ({
              admission_id: admissionData.id,
              invoice_id: invData.id,
              charge_type: c.charge_type,
              description: c.description,
              quantity: 1,
              unit_price: c.amount,
              amount: c.amount,
              created_by: profile?.id,
            }))
          );
          if (chgErr) throw chgErr;
        }
      }

      toast.success(
        paymentAmount > 0
          ? `Pending admission created with Rs ${paymentAmount.toLocaleString()} payment collected`
          : "Patient referred to IPD — pending admission created"
      );
      setOpen(false);
      setChiefComplaint(""); setProvisionalDiagnosis(""); setNotes("");
      setDoctorFee(0); setAnesthesiaFee(0); setOtaFee(0); setOtCharges(0); setPaymentAmount(0);
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
              <Banknote className="w-4 h-4" /> Upfront Payment
            </h4>
            <p className="text-xs text-muted-foreground mb-3">Collect operation charges upfront. Remaining charges (stay, pharmacy, lab) will be collected at discharge.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Doctor Fees</Label>
                <Input type="number" min={0} value={doctorFee || ""} onChange={(e) => setDoctorFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>Anesthesia / Anesthetist</Label>
                <Input type="number" min={0} value={anesthesiaFee || ""} onChange={(e) => setAnesthesiaFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>OTA (OT Assistant)</Label>
                <Input type="number" min={0} value={otaFee || ""} onChange={(e) => setOtaFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>OT Charges</Label>
                <Input type="number" min={0} value={otCharges || ""} onChange={(e) => setOtCharges(Number(e.target.value) || 0)} placeholder="0" />
              </div>
            </div>
            {totalUpfront > 0 && (
              <div className="bg-muted rounded-md p-2 mt-2 text-sm space-y-1">
                <div className="flex justify-between font-medium"><span>Total Upfront</span><span>{formatPkrAmount(totalUpfront)}</span></div>
                <div>
                  <Label className="text-xs">Payment Amount</Label>
                  <Input type="number" min={0} value={paymentAmount || ""} onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)} placeholder="0" className="h-8 mt-1" />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Referring..." : paymentAmount > 0 ? `Create & Collect Rs ${paymentAmount.toLocaleString()}` : "Create Pending Admission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
