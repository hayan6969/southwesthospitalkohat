import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { generateDischargeBillPDF } from "@/utils/dischargeBillPdfGenerator";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
}

export function InvoiceViewDialog({ open, onOpenChange, admission }: Props) {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [charges, setCharges] = useState<any[]>([]);
  const [patientName, setPatientName] = useState("");
  const [bedWard, setBedWard] = useState<any>(null);
  const [days, setDays] = useState(0);
  const { data: patientNames } = usePatientNames();

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const name = getPatientName(admission.patient_id, patientNames || []);
      setPatientName(name);

      const [invRes, chgRes, admRes] = await Promise.all([
        supabase.from("ipd_invoices").select("*").eq("admission_id", admission.id).maybeSingle(),
        supabase.from("ipd_charges").select("*").eq("admission_id", admission.id).order("created_at"),
        supabase.from("ipd_admissions").select("*, beds(bed_number), wards(name)").eq("id", admission.id).maybeSingle(),
      ]);
      setInvoice(invRes.data);
      setCharges(chgRes.data ?? []);
      setBedWard(admRes.data);
      if (admRes.data?.admission_date && admRes.data?.discharge_date) {
        setDays(Math.max(1, Math.ceil((new Date(admRes.data.discharge_date).getTime() - new Date(admRes.data.admission_date).getTime()) / 86400000)));
      }
      setLoading(false);
    })();
  }, [open, admission, patientNames]);

  const handlePdf = async () => {
    if (!invoice) return;
    await generateDischargeBillPDF({
      invoiceNumber: invoice.invoice_number,
      admissionNumber: admission.admission_number,
      patientName,
      wardName: bedWard?.wards?.name,
      bedNumber: bedWard?.beds?.bed_number,
      admissionDate: admission.admission_date,
      dischargeDate: admission.discharge_date,
      days,
      items: charges.map((c: any) => ({ description: c.description, qty: Number(c.quantity), unit: Number(c.unit_price), amount: Number(c.amount) })),
      subtotal: Number(invoice.total_amount) + Number(invoice.discount),
      discount: Number(invoice.discount),
      total: Number(invoice.total_amount),
      paid: Number(invoice.paid_amount),
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto z-[9999]">
          <div className="flex justify-center p-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto z-[9999]">
          <DialogTitle>Invoice — {admission?.admission_number}</DialogTitle>
          <p className="text-center text-muted-foreground py-8">No invoice found for this admission.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Invoice — {invoice.invoice_number}</DialogTitle>
          <Button size="sm" variant="outline" onClick={handlePdf}><Download className="w-4 h-4 mr-1" />PDF</Button>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Admission #</span><p className="font-medium">{admission.admission_number}</p></div>
            <div><span className="text-xs text-muted-foreground">Patient</span><p className="font-medium">{patientName}</p></div>
            <div><span className="text-xs text-muted-foreground">Ward / Bed</span><p className="font-medium">{bedWard?.wards?.name || "—"} / {bedWard?.beds?.bed_number || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Stay</span><p className="font-medium">{days} day(s)</p></div>
            <div><span className="text-xs text-muted-foreground">Admitted</span><p className="font-medium">{admission.admission_date ? format(new Date(admission.admission_date), "MMM d, yyyy HH:mm") : "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Discharged</span><p className="font-medium">{admission.discharge_date ? format(new Date(admission.discharge_date), "MMM d, yyyy HH:mm") : "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><p className="font-medium">{invoice.status}</p></div>
            <div><span className="text-xs text-muted-foreground">Finalized</span><p className="font-medium">{invoice.finalized_at ? format(new Date(invoice.finalized_at), "MMM d, yyyy HH:mm") : "—"}</p></div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left text-xs font-medium p-2" style={{ width: "70px" }}>Category</th>
                  <th className="text-left text-xs font-medium p-2" style={{ width: "auto" }}>Description</th>
                  <th className="text-right text-xs font-medium p-2" style={{ width: "40px" }}>Qty</th>
                  <th className="text-right text-xs font-medium p-2" style={{ width: "70px" }}>Unit</th>
                  <th className="text-right text-xs font-medium p-2" style={{ width: "80px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {charges.filter((c: any) => c.charge_type !== "deposit").length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted-foreground text-sm py-6">No charges recorded</td></tr>
                ) : charges.filter((c: any) => c.charge_type !== "deposit").map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="text-xs p-2 align-top">{c.charge_type}</td>
                    <td className="text-xs p-2 align-top break-words" style={{ wordBreak: "break-word" }}>{c.description}</td>
                    <td className="text-right text-xs p-2 align-top">{c.quantity}</td>
                    <td className="text-right text-xs p-2 align-top whitespace-nowrap">{formatPkrAmount(c.unit_price)}</td>
                    <td className="text-right text-xs font-medium p-2 align-top whitespace-nowrap">{formatPkrAmount(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Bed Charges</span><span>{formatPkrAmount(Number(invoice.bed_charges_total))}</span></div>
            <div className="flex justify-between"><span>Doctor Charges</span><span>{formatPkrAmount(Number(invoice.doctor_charges_total))}</span></div>
            <div className="flex justify-between"><span>Medicine Charges</span><span>{formatPkrAmount(Number(invoice.medicine_charges_total))}</span></div>
            <div className="flex justify-between"><span>Lab Charges</span><span>{formatPkrAmount(Number(invoice.lab_charges_total))}</span></div>
            <div className="flex justify-between"><span>Other Charges</span><span>{formatPkrAmount(Number(invoice.other_charges_total))}</span></div>
            <div className="flex justify-between font-medium"><span>Subtotal</span><span>{formatPkrAmount(Number(invoice.total_amount) + Number(invoice.discount))}</span></div>
            <div className="flex justify-between text-destructive"><span>Discount</span><span>- {formatPkrAmount(Number(invoice.discount))}</span></div>
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total Due</span><span>{formatPkrAmount(Number(invoice.total_amount))}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>{formatPkrAmount(Number(invoice.paid_amount))}</span></div>
            <div className="flex justify-between font-medium border-t pt-1"><span>Balance</span><span className={Number(invoice.total_amount) - Number(invoice.paid_amount) > 0 ? "text-red-600" : "text-green-600"}>{formatPkrAmount(Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount)))}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
