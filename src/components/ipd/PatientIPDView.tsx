import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, BedDouble, Receipt } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import { format } from "date-fns";
import { generateDischargeBillPDF } from "@/utils/dischargeBillPdfGenerator";
import { toast } from "sonner";

interface Admission {
  id: string;
  admission_number: string;
  status: string;
  admission_date: string;
  discharge_date: string | null;
  complaint?: string | null;
  wards?: { name: string } | null;
  beds?: { bed_number: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  admission_id: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  finalized_at: string | null;
  created_at: string;
}

export function PatientIPDView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setLoading(true);
      const [aRes, iRes] = await Promise.all([
        supabase
          .from("ipd_admissions")
          .select("id,admission_number,status,admission_date,discharge_date,complaint,wards(name),beds(bed_number)")
          .eq("patient_id", profile.id)
          .order("admission_date", { ascending: false }),
        supabase
          .from("ipd_invoices")
          .select("id,invoice_number,admission_id,total_amount,paid_amount,status,finalized_at,created_at")
          .eq("patient_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);
      setAdmissions((aRes.data ?? []) as any);
      setInvoices((iRes.data ?? []) as any);
      setLoading(false);
    })();
  }, [profile?.id]);

  const downloadInvoice = async (inv: Invoice) => {
    setDownloading(inv.id);
    try {
      const adm = admissions.find(a => a.id === inv.admission_id);
      const { data: charges } = await supabase
        .from("ipd_charges")
        .select("description,quantity,unit_price,amount")
        .eq("invoice_id", inv.id);

      const items = (charges ?? []).map((c: any) => ({
        description: c.description,
        qty: Number(c.quantity || 1),
        unit: Number(c.unit_price || 0),
        amount: Number(c.amount || 0),
      }));

      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const days = adm?.discharge_date && adm?.admission_date
        ? Math.max(1, Math.ceil((new Date(adm.discharge_date).getTime() - new Date(adm.admission_date).getTime()) / 86400000))
        : 1;

      await generateDischargeBillPDF({
        invoiceNumber: inv.invoice_number,
        admissionNumber: adm?.admission_number ?? "",
        patientName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
        wardName: adm?.wards?.name,
        bedNumber: adm?.beds?.bed_number,
        admissionDate: adm?.admission_date ?? new Date().toISOString(),
        dischargeDate: adm?.discharge_date ?? new Date().toISOString(),
        days,
        items,
        subtotal,
        discount: Math.max(0, subtotal - Number(inv.total_amount)),
        total: Number(inv.total_amount),
        paid: Number(inv.paid_amount),
      });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to download invoice");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="w-4 h-4" /> My IPD Admissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No IPD admissions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Ward / Bed</TableHead>
                    <TableHead>Admitted</TableHead>
                    <TableHead>Discharged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admissions.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-xs">{a.admission_number}</TableCell>
                      <TableCell className="text-xs">{a.wards?.name ?? "-"} / {a.beds?.bed_number ?? "-"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.admission_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">{a.discharge_date ? format(new Date(a.discharge_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "discharged" ? "secondary" : a.status === "admitted" ? "default" : "outline"}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4" /> IPD Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No IPD invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{format(new Date(inv.finalized_at ?? inv.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.total_amount))}</TableCell>
                      <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.paid_amount))}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "paid" ? "default" : "outline"}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(inv)} disabled={downloading === inv.id}>
                          {downloading === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          <span className="ml-1 text-xs">PDF</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
