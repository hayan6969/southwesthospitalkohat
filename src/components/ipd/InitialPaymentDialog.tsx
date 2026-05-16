import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Banknote } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
  onCollected: () => void;
}

export function InitialPaymentDialog({ open, onOpenChange, admission, patientName, onCollected }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<any>(null);
  const [existingCharges, setExistingCharges] = useState<any[]>([]);
  const [doctorFee, setDoctorFee] = useState(0);
  const [anesthesiaFee, setAnesthesiaFee] = useState(0);
  const [otaFee, setOtaFee] = useState(0);
  const [otCharges, setOtCharges] = useState(0);
  const [payment, setPayment] = useState(0);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const { data: invoice } = await supabase.from("ipd_invoices").select("*").eq("admission_id", admission.id).maybeSingle();
      setExistingInvoice(invoice);
      if (invoice) {
        const { data: charges } = await supabase.from("ipd_charges").select("*").eq("admission_id", admission.id).eq("invoice_id", invoice.id);
        const existing = charges ?? [];
        setExistingCharges(existing);
        setDoctorFee(existing.find((c: any) => c.charge_type === "doctor")?.amount || 0);
        setAnesthesiaFee(existing.find((c: any) => c.charge_type === "anesthesia")?.amount || 0);
        setOtaFee(existing.find((c: any) => c.charge_type === "ota")?.amount || 0);
        setOtCharges(existing.find((c: any) => c.charge_type === "ot")?.amount || 0);
        setPayment(Number(invoice.paid_amount) || 0);
      }
      setLoading(false);
    })();
  }, [open, admission]);

  const totalUpfront = doctorFee + anesthesiaFee + otaFee + otCharges;
  const alreadyPaid = existingInvoice ? Number(existingInvoice.paid_amount) : 0;

  const submit = async () => {
    if (saving) return;
    if (totalUpfront === 0) { toast.error("Enter at least one charge amount"); return; }
    setSaving(true);
    try {
      let invoiceId = existingInvoice?.id;
      let invoiceNumber = existingInvoice?.invoice_number;

      if (!invoiceId) {
        const { data: numData } = await supabase.rpc("generate_ipd_invoice_number");
        invoiceNumber = numData as string;
        const { data, error } = await supabase.from("ipd_invoices").insert({
          invoice_number: invoiceNumber,
          admission_id: admission.id,
          patient_id: admission.patient_id,
        }).select("id").single();
        if (error) throw error;
        invoiceId = data.id;
      }

      await supabase.from("ipd_charges").delete()
        .eq("admission_id", admission.id)
        .eq("invoice_id", invoiceId)
        .in("charge_type", ["doctor", "anesthesia", "ota", "ot"]);

      const chargeRows: any[] = [];
      if (doctorFee > 0) chargeRows.push({ charge_type: "doctor", description: "Doctor fees", amount: doctorFee });
      if (anesthesiaFee > 0) chargeRows.push({ charge_type: "anesthesia", description: "Anesthesia/Anesthetist fees", amount: anesthesiaFee });
      if (otaFee > 0) chargeRows.push({ charge_type: "ota", description: "OT Assistant fees", amount: otaFee });
      if (otCharges > 0) chargeRows.push({ charge_type: "ot", description: "Operation Theatre charges", amount: otCharges });

      if (chargeRows.length > 0) {
        const { error } = await supabase.from("ipd_charges").insert(
          chargeRows.map(c => ({
            admission_id: admission.id,
            invoice_id: invoiceId,
            charge_type: c.charge_type,
            description: c.description,
            quantity: 1,
            unit_price: c.amount,
            amount: c.amount,
            created_by: profile?.id,
            assigned_to: c.charge_type === "doctor" ? "doctor"
              : c.charge_type === "anesthesia" ? "anesthesiologist"
              : "hospital",
            doctor_id: c.charge_type === "doctor" ? admission.doctor_id : null,
            anesthesiologist_id: c.charge_type === "anesthesia" ? (admission.anesthesiologist_id ?? null) : null,
          }))
        );
        if (error) throw error;
      }

      const newPaid = alreadyPaid + payment;
      const { error: invErr } = await supabase.from("ipd_invoices").update({
        paid_amount: newPaid,
        doctor_charges_total: doctorFee,
        anesthesia_charges_total: anesthesiaFee,
        ota_charges_total: otaFee,
        ot_charges_total: otCharges,
        other_charges_total: 0,
      }).eq("id", invoiceId);
      if (invErr) throw invErr;

      // Create ipd_doctor_payments records
      const doctorPaymentsToCreate: any[] = [];
      if (doctorFee > 0 && admission.doctor_id) {
        doctorPaymentsToCreate.push({
          doctor_id: admission.doctor_id,
          admission_id: admission.id,
          charge_type: "doctor",
          amount: doctorFee,
          status: "pending",
        });
      }
      if (anesthesiaFee > 0 && admission.anesthesiologist_id) {
        doctorPaymentsToCreate.push({
          doctor_id: admission.anesthesiologist_id,
          admission_id: admission.id,
          charge_type: "anesthesia",
          amount: anesthesiaFee,
          status: "pending",
        });
      }
      if (otaFee > 0) {
        doctorPaymentsToCreate.push({
          doctor_id: admission.doctor_id,
          admission_id: admission.id,
          charge_type: "ota",
          amount: otaFee,
          status: "pending",
        });
      }
      if (doctorPaymentsToCreate.length > 0) {
        const { error: dpError } = await supabase.from("ipd_doctor_payments").insert(doctorPaymentsToCreate);
        if (dpError) console.warn("Failed to create IPD doctor payments:", dpError);
      }

      toast.success(`Initial payment of Rs ${payment.toLocaleString()} collected`);
      onCollected();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to process payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Banknote className="w-5 h-5" />Initial Payment — {admission?.admission_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">{patientName}</p>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Collect upfront charges for operation. Remaining charges (stay, pharmacy, lab) will be collected at discharge.</p>
            <div className="grid gap-3">
              <div>
                <Label>Doctor Fees</Label>
                <Input type="number" value={doctorFee || ""} onChange={e => setDoctorFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>Anesthesia / Anesthetist</Label>
                <Input type="number" value={anesthesiaFee || ""} onChange={e => setAnesthesiaFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>OTA (OT Assistant)</Label>
                <Input type="number" value={otaFee || ""} onChange={e => setOtaFee(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <Label>OT Charges</Label>
                <Input type="number" value={otCharges || ""} onChange={e => setOtCharges(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div className="border-t pt-3">
                <div className="bg-muted rounded-md p-3 space-y-1 text-sm mb-3">
                  <div className="flex justify-between"><span>Total Upfront Charges</span><span className="font-bold">{formatPkrAmount(totalUpfront)}</span></div>
                  {alreadyPaid > 0 && <div className="flex justify-between"><span>Already Paid</span><span className="text-green-600">{formatPkrAmount(alreadyPaid)}</span></div>}
                </div>
                <Label>Payment Amount</Label>
                <Input type="number" value={payment || ""} onChange={e => setPayment(Number(e.target.value) || 0)} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">Enter the amount being paid now</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={submit} disabled={saving || totalUpfront === 0}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {payment > 0 ? `Collect Rs ${payment.toLocaleString()}` : "Save Charges"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
