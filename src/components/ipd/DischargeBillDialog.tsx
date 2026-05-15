import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
}

interface LineItem {
  category: string;
  description: string;
  qty: number;
  unit: number;
  amount: number;
}

export function DischargeBillDialog({ open, onOpenChange, admission, patientName, onDischarged }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [otherDesc, setOtherDesc] = useState("");
  const [otherAmt, setOtherAmt] = useState(0);
  const [docFee, setDocFee] = useState(0);
  const [days, setDays] = useState(1);

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const admDate = new Date(admission.admission_date);
      const now = new Date();
      const d = Math.max(1, Math.ceil((now.getTime() - admDate.getTime()) / 86400000));
      setDays(d);

      const [bedRes, medRes, labRes, docRes, invoiceRes] = await Promise.all([
        admission.bed_id ? supabase.from("beds").select("daily_charge,bed_number").eq("id", admission.bed_id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from("ipd_medicine_orders").select("medicine_name,quantity,unit_price,status").eq("admission_id", admission.id).in("status", ["dispensed", "received", "administered"]),
        supabase.from("ipd_lab_orders").select("test_name,charge,status").eq("admission_id", admission.id).eq("status", "completed"),
        admission.doctor_id ? supabase.from("doctors").select("consultation_fee").eq("id", admission.doctor_id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from("ipd_invoices").select("paid_amount").eq("admission_id", admission.id).maybeSingle(),
      ]);

      const list: LineItem[] = [];
      if (bedRes.data?.daily_charge) {
        list.push({
          category: "Bed",
          description: `Bed ${bedRes.data.bed_number} × ${d} day(s)`,
          qty: d,
          unit: Number(bedRes.data.daily_charge),
          amount: d * Number(bedRes.data.daily_charge),
        });
      }
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

      setDocFee(Number(docRes.data?.consultation_fee) || 0);
      setItems(list);
      setDeposit(Number(invoiceRes.data?.paid_amount) || 0);
      setLoading(false);
    })();
  }, [open, admission]);

  const totals = useMemo(() => {
    const bed = items.filter(i => i.category === "Bed").reduce((s, i) => s + i.amount, 0);
    const doc = Number(docFee) || 0;
    const med = items.filter(i => i.category === "Medicine").reduce((s, i) => s + i.amount, 0);
    const lab = items.filter(i => i.category === "Lab").reduce((s, i) => s + i.amount, 0);
    const other = Number(otherAmt) || 0;
    const subtotal = bed + doc + med + lab + other;
    const total = Math.max(0, subtotal - (Number(discount) || 0));
    return { bed, doc, med, lab, other, subtotal, total };
  }, [items, docFee, otherAmt, discount]);

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
        other_charges_total: totals.other,
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
      const chargeRows = [
        ...items,
        ...(docFee > 0 ? [{ category: "Doctor", description: `Consultation fee`, qty: 1, unit: docFee, amount: docFee }] : []),
        ...(otherAmt > 0 ? [{ category: "Other", description: otherDesc || "Other", qty: 1, unit: Number(otherAmt), amount: Number(otherAmt) }] : []),
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

      // Discharge admission
      const { error: dErr } = await supabase
        .from("ipd_admissions")
        .update({ status: "discharged", discharge_date: new Date().toISOString() })
        .eq("id", admission.id);
      if (dErr) throw dErr;

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

      toast.success("Patient discharged & bill generated");
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
          <DialogTitle>Final Discharge Bill — {patientName} ({admission?.admission_number})</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Stay duration: <strong>{days}</strong> day(s) · Ward: {admission.wards?.name} · Bed: {admission.beds?.bed_number}
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">No accumulated charges</TableCell></TableRow>
                  ) : items.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{i.category}</TableCell>
                      <TableCell className="text-xs">{i.description}</TableCell>
                      <TableCell className="text-right text-xs">{i.qty}</TableCell>
                      <TableCell className="text-right text-xs">{formatPkrAmount(i.unit)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{formatPkrAmount(i.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Doctor Fee (manual)</Label>
                <Input type="number" value={docFee} onChange={(e) => setDocFee(Number(e.target.value))} placeholder="Enter fee" />
              </div>
              <div>
                <Label>Other Charge — Description</Label>
                <Input value={otherDesc} onChange={(e) => setOtherDesc(e.target.value)} placeholder="e.g. ICU fee" />
              </div>
              <div>
                <Label>Other Charge — Amount</Label>
                <Input type="number" value={otherAmt} onChange={(e) => setOtherAmt(Number(e.target.value))} />
              </div>
              <div>
                <Label>Discount</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
              <div>
                <Label>Initial Deposit (paid earlier)</Label>
                <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <Label>Payment at Discharge</Label>
                <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} placeholder="0" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Bed Charges</span><span>{formatPkrAmount(totals.bed)}</span></div>
              <div className="flex justify-between"><span>Doctor Charges (manual)</span><span>{formatPkrAmount(totals.doc)}</span></div>
              <div className="flex justify-between"><span>Medicine Charges</span><span>{formatPkrAmount(totals.med)}</span></div>
              <div className="flex justify-between"><span>Lab Charges</span><span>{formatPkrAmount(totals.lab)}</span></div>
              <div className="flex justify-between"><span>Other</span><span>{formatPkrAmount(totals.other)}</span></div>
              <div className="flex justify-between font-medium"><span>Subtotal</span><span>{formatPkrAmount(totals.subtotal)}</span></div>
              <div className="flex justify-between text-destructive"><span>Discount</span><span>- {formatPkrAmount(Number(discount) || 0)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total Due</span><span>{formatPkrAmount(totals.total)}</span></div>
              <div className="flex justify-between"><span>Initial Deposit</span><span>{formatPkrAmount(Number(deposit) || 0)}</span></div>
              <div className="flex justify-between"><span>Payment at Discharge</span><span>{formatPkrAmount(Number(paid) || 0)}</span></div>
              <div className="flex justify-between font-medium border-t pt-1"><span>Total Paid</span><span>{formatPkrAmount((Number(deposit) || 0) + (Number(paid) || 0))}</span></div>
              <div className="flex justify-between font-medium"><span>Balance</span><span>{formatPkrAmount(Math.max(0, totals.total - (Number(deposit) || 0) - (Number(paid) || 0)))}</span></div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={finalize} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Finalize, Discharge & Generate PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}