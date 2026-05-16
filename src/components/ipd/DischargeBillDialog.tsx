import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPkrAmount } from "@/utils/currency";
import { generateDischargeBillPDF } from "@/utils/dischargeBillPdfGenerator";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
  onDischarged: () => void;
  billOnly?: boolean;
}

interface LineItem {
  category: string;
  description: string;
  qty: number;
  unit: number;
  amount: number;
}

export function DischargeBillDialog({ open, onOpenChange, admission, patientName, onDischarged, billOnly }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [upfrontCollected, setUpfrontCollected] = useState(false);
  const [existingDoctorFee, setExistingDoctorFee] = useState(0);
  const [existingAnesthesiaFee, setExistingAnesthesiaFee] = useState(0);
  const [existingOtaFee, setExistingOtaFee] = useState(0);
  const [existingOtCharges, setExistingOtCharges] = useState(0);
  const [stayCharges, setStayCharges] = useState(0);
  const [days, setDays] = useState(1);
  const [bedDailyRate, setBedDailyRate] = useState(0);
  const [freeFirstDay, setFreeFirstDay] = useState(true);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const admDate = new Date(admission.admission_date);
      const now = new Date();
      const d = Math.max(1, Math.ceil((now.getTime() - admDate.getTime()) / 86400000));
      setDays(d);

      const [bedRes, medRes, labRes, docRes, invoiceRes, chgRes] = await Promise.all([
        admission.bed_id ? supabase.from("beds").select("daily_charge,bed_number").eq("id", admission.bed_id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from("ipd_medicine_orders").select("medicine_name,quantity,unit_price,status").eq("admission_id", admission.id).in("status", ["dispensed", "received", "administered"]),
        supabase.from("ipd_lab_orders").select("test_name,charge,status").eq("admission_id", admission.id).eq("status", "completed"),
        admission.doctor_id ? supabase.from("doctors").select("consultation_fee").eq("id", admission.doctor_id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from("ipd_invoices").select("id, paid_amount").eq("admission_id", admission.id).maybeSingle(),
        supabase.from("ipd_charges").select("charge_type, amount").eq("admission_id", admission.id),
      ]);

      const existing = chgRes.data ?? [];
      const hasDoctor = existing.find((c: any) => c.charge_type === "doctor");
      const hasAnesthesia = existing.find((c: any) => c.charge_type === "anesthesia");
      const hasOta = existing.find((c: any) => c.charge_type === "ota");
      const hasOt = existing.find((c: any) => c.charge_type === "ot");
      const hasUpfront = hasDoctor || hasAnesthesia || hasOta || hasOt;
      setUpfrontCollected(!!hasUpfront);
      if (hasDoctor) setExistingDoctorFee(Number(hasDoctor.amount));
      if (hasAnesthesia) setExistingAnesthesiaFee(Number(hasAnesthesia.amount));
      if (hasOta) setExistingOtaFee(Number(hasOta.amount));
      if (hasOt) setExistingOtCharges(Number(hasOt.amount));

      const list: LineItem[] = [];
      const daily = Number(bedRes.data?.daily_charge || 0);
      setBedDailyRate(daily);
      // Add existing upfront charges as read-only line items
      if (hasDoctor) list.push({ category: "Doctor", description: "Doctor fees (already collected)", qty: 1, unit: Number(hasDoctor.amount), amount: Number(hasDoctor.amount) });
      if (hasAnesthesia) list.push({ category: "Anesthesia", description: "Anesthesia (already collected)", qty: 1, unit: Number(hasAnesthesia.amount), amount: Number(hasAnesthesia.amount) });
      if (hasOta) list.push({ category: "OTA", description: "OTA (already collected)", qty: 1, unit: Number(hasOta.amount), amount: Number(hasOta.amount) });
      if (hasOt) list.push({ category: "OT", description: "OT charges (already collected)", qty: 1, unit: Number(hasOt.amount), amount: Number(hasOt.amount) });
      (medRes.data ?? []).forEach((m: any) => {
        list.push({
          category: "Medicine",
          description: m.medicine_name,
          qty: Number(m.quantity || 1),
          unit: Number(m.unit_price || 0),
          amount: Number(m.quantity || 1) * Number(m.unit_price || 0),
        });
      });
      (labRes.data ?? []).forEach((l: any) => {
        list.push({
          category: "Lab",
          description: l.test_name,
          qty: 1,
          unit: Number(l.charge || 0),
          amount: Number(l.charge || 0),
        });
      });

      const baseStay = Math.max(0, d - (freeFirstDay ? 1 : 0)) * daily;
      setStayCharges(baseStay);
      setItems(list);
      setDeposit(Number(invoiceRes.data?.paid_amount) || 0);
      setLoading(false);
    })();
  }, [open, admission]);

  const totals = useMemo(() => {
    const bed = Number(stayCharges) || 0;
    const doc = Number(existingDoctorFee) || 0;
    const anes = Number(existingAnesthesiaFee) || 0;
    const ota = Number(existingOtaFee) || 0;
    const ot = Number(existingOtCharges) || 0;
    const med = items.filter(i => i.category === "Medicine").reduce((s, i) => s + i.amount, 0);
    const lab = items.filter(i => i.category === "Lab").reduce((s, i) => s + i.amount, 0);
    const subtotal = bed + doc + anes + ota + ot + med + lab;
    const total = Math.max(0, subtotal - (Number(discount) || 0));
    return { bed, doc, anes, ota, ot, med, lab, subtotal, total };
  }, [items, existingDoctorFee, existingAnesthesiaFee, existingOtaFee, existingOtCharges, stayCharges, discount]);

  const paidDays = () => {
    if (freeFirstDay) return Math.max(0, days - 1);
    return days;
  };

  // Auto-recalculate stay charges when days or freeFirstDay changes
  useEffect(() => {
    const chargeableDays = Math.max(0, days - (freeFirstDay ? 1 : 0));
    setStayCharges(chargeableDays * bedDailyRate);
  }, [days, freeFirstDay, bedDailyRate]);

  const finalize = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("ipd_invoices")
        .select("id, invoice_number")
        .eq("admission_id", admission.id)
        .maybeSingle();

      let invoiceId = existing?.id;
      let invoiceNumber = existing?.invoice_number;

      const totalDeposit = (Number(deposit) || 0) + (Number(paid) || 0);

      const payload = {
        admission_id: admission.id,
        patient_id: admission.patient_id,
        bed_charges_total: totals.bed,
        doctor_charges_total: totals.doc,
        medicine_charges_total: totals.med,
        lab_charges_total: totals.lab,
        nursing_charges_total: 0,
        other_charges_total: totals.anes + totals.ota + totals.ot + 0,
        discount: Number(discount) || 0,
        total_amount: totals.total,
        paid_amount: totalDeposit,
        status: totalDeposit >= totals.total ? "paid" : "pending",
        finalized_at: new Date().toISOString(),
      };

      if (invoiceId) {
        const { error } = await supabase.from("ipd_invoices").update(payload).eq("id", invoiceId);
        if (error) throw error;
      } else {
        const { data: numData } = await supabase.rpc("generate_ipd_invoice_number");
        invoiceNumber = numData as string;
        const { data, error } = await supabase
          .from("ipd_invoices")
          .insert({ ...payload, invoice_number: invoiceNumber })
          .select("id")
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }

      // Persist line items as ipd_charges
      await supabase.from("ipd_charges").delete().eq("admission_id", admission.id).eq("invoice_id", invoiceId);
      const manualCharges: LineItem[] = [];
      if (stayCharges > 0) manualCharges.push({ category: "Stay", description: `Stay charges ${freeFirstDay ? `(${paidDays()} chargeable day(s), 1st free)` : `(${days} day(s))`}`, qty: paidDays(), unit: bedDailyRate, amount: stayCharges });
      const chargeRows = [
        ...items,
        ...manualCharges,
      ].map(i => ({
        admission_id: admission.id,
        invoice_id: invoiceId,
        charge_type: i.category.toLowerCase(),
        description: i.description,
        quantity: i.qty,
        unit_price: i.unit,
        amount: i.amount,
      }));
      if (chargeRows.length) {
        const { error } = await supabase.from("ipd_charges").insert(chargeRows);
        if (error) throw error;
      }

      // Discharge admission (skip if bill-only mode for staff)
      if (!billOnly) {
        const { error: dErr } = await supabase
          .from("ipd_admissions")
          .update({ status: "discharged", discharge_date: new Date().toISOString() })
          .eq("id", admission.id);
        if (dErr) throw dErr;
      }

      // PDF
      await generateDischargeBillPDF({
        invoiceNumber: invoiceNumber!,
        admissionNumber: admission.admission_number,
        patientName,
        wardName: admission.wards?.name,
        bedNumber: admission.beds?.bed_number,
        admissionDate: admission.admission_date,
        dischargeDate: new Date().toISOString(),
        days,
        items: chargeRows.map(c => ({ description: c.description, qty: c.quantity, unit: c.unit_price, amount: c.amount })),
        subtotal: totals.subtotal,
        discount: Number(discount) || 0,
        total: totals.total,
        paid: totalDeposit,
      });

      toast.success(billOnly ? "Bill finalized" : "Patient discharged & bill generated");
      onDischarged();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to finalize");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>{billOnly ? "Finalize Bill" : "Final Discharge Bill"} — {patientName} ({admission?.admission_number})</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Stay duration: <strong>{days}</strong> day(s) · Ward: {admission.wards?.name} · Bed: {admission.beds?.bed_number}
            </div>

            <div className="border rounded-md overflow-x-auto">
              <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium p-2" style={{ width: "70px" }}>Category</th>
                    <th className="text-left text-xs font-medium p-2" style={{ width: "auto" }}>Description</th>
                    <th className="text-right text-xs font-medium p-2" style={{ width: "40px" }}>Qty</th>
                    <th className="text-right text-xs font-medium p-2" style={{ width: "70px" }}>Unit</th>
                    <th className="text-right text-xs font-medium p-2" style={{ width: "80px" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted-foreground text-sm py-4">No accumulated charges</td></tr>
                  ) : items.map((i, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="text-xs p-2 align-top">{i.category}</td>
                      <td className="text-xs p-2 align-top break-words" style={{ wordBreak: "break-word" }}>{i.description}</td>
                      <td className="text-right text-xs p-2 align-top">{i.qty}</td>
                      <td className="text-right text-xs p-2 align-top whitespace-nowrap">{formatPkrAmount(i.unit)}</td>
                      <td className="text-right text-xs font-medium p-2 align-top whitespace-nowrap">{formatPkrAmount(i.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-3">Remaining Charges</h4>
              {upfrontCollected && (
                <div className="bg-muted rounded-md p-2 mb-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Upfront charges already collected:</p>
                  {existingDoctorFee > 0 && <div className="flex justify-between"><span>Doctor Fees</span><span>{formatPkrAmount(existingDoctorFee)}</span></div>}
                  {existingAnesthesiaFee > 0 && <div className="flex justify-between"><span>Anesthesia</span><span>{formatPkrAmount(existingAnesthesiaFee)}</span></div>}
                  {existingOtaFee > 0 && <div className="flex justify-between"><span>OTA</span><span>{formatPkrAmount(existingOtaFee)}</span></div>}
                  {existingOtCharges > 0 && <div className="flex justify-between"><span>OT Charges</span><span>{formatPkrAmount(existingOtCharges)}</span></div>}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label>Stay Charges</Label>
                  <Input type="number" value={stayCharges} onChange={(e) => setStayCharges(Number(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <Label>Discount</Label>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <Label>Initial Deposit (paid earlier) <span className="text-xs text-muted-foreground">(locked)</span></Label>
                  <Input type="number" value={deposit} disabled placeholder="0" className="bg-muted" />
                </div>
                <div>
                  <Label>Payment at Discharge</Label>
                  <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} placeholder="0" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={freeFirstDay} onChange={(e) => setFreeFirstDay(e.target.checked)} className="rounded" />
                    <span className="text-sm">1st day stay free</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              {existingDoctorFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Doctor Fees (paid)</span><span>{formatPkrAmount(totals.doc)}</span></div>}
              {existingAnesthesiaFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Anesthesia (paid)</span><span>{formatPkrAmount(totals.anes)}</span></div>}
              {existingOtaFee > 0 && <div className="flex justify-between text-muted-foreground"><span>OTA (paid)</span><span>{formatPkrAmount(totals.ota)}</span></div>}
              {existingOtCharges > 0 && <div className="flex justify-between text-muted-foreground"><span>OT Charges (paid)</span><span>{formatPkrAmount(totals.ot)}</span></div>}
              <div className="flex justify-between"><span>Stay Charges ({paidDays()} day(s) @ Rs {bedDailyRate.toLocaleString()})</span><span>{formatPkrAmount(totals.bed)}</span></div>
              <div className="flex justify-between"><span>Medicine Charges</span><span>{formatPkrAmount(totals.med)}</span></div>
              <div className="flex justify-between"><span>Lab Charges</span><span>{formatPkrAmount(totals.lab)}</span></div>
              <div className="flex justify-between font-medium"><span>Subtotal</span><span>{formatPkrAmount(totals.subtotal)}</span></div>
              <div className="flex justify-between text-destructive"><span>Discount</span><span>- {formatPkrAmount(Number(discount) || 0)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total Due</span><span>{formatPkrAmount(totals.total)}</span></div>
              <div className="flex justify-between"><span>Initial Deposit</span><span>{formatPkrAmount(Number(deposit) || 0)}</span></div>
              <div className="flex justify-between"><span>Payment at Discharge</span><span>{formatPkrAmount(Number(paid) || 0)}</span></div>
              <div className="flex justify-between font-medium border-t pt-1"><span>Total Paid</span><span>{formatPkrAmount((Number(deposit) || 0) + (Number(paid) || 0))}</span></div>
              <div className="flex justify-between font-medium"><span>Balance</span><span className={totals.total - (Number(deposit) || 0) - (Number(paid) || 0) > 0 ? "text-red-600" : "text-green-600"}>{formatPkrAmount(totals.total - (Number(deposit) || 0) - (Number(paid) || 0))}</span></div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={finalize} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {billOnly ? "Finalize Bill & Generate PDF" : "Finalize, Discharge & Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}