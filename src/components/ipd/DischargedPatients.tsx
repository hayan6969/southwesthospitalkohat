import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Loader2, Search, ChevronLeft, ChevronRight, FileText, Download, Eye } from "lucide-react";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { AdmissionFormDialog } from "./AdmissionFormDialog";
import { DischargeSummaryDialog } from "./DischargeSummaryDialog";
import { InvoiceViewDialog } from "./InvoiceViewDialog";
import { formatPkrAmount } from "@/utils/currency";
import { generateDischargeBillPDF } from "@/utils/dischargeBillPdfGenerator";

export function DischargedPatients() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formFor, setFormFor] = useState<any>(null);
  const [summaryFor, setSummaryFor] = useState<any>(null);
  const [invoiceViewFor, setInvoiceViewFor] = useState<any>(null);
  const itemsPerPage = 20;
  const { data: patientNames } = usePatientNames();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ipd_admissions")
      .select("*, beds(bed_number), wards(name)")
      .eq("status", "discharged")
      .order("discharge_date", { ascending: false });
    setRows(data ?? []);

    if (data && data.length > 0) {
      const { data: invData } = await supabase
        .from("ipd_invoices")
        .select("id, invoice_number, total_amount, paid_amount, status, finalized_at")
        .in("admission_id", data.map(r => r.id));
      const invMap: Record<string, any> = {};
      (invData ?? []).forEach((inv: any) => {
        invMap[inv.admission_id] = inv;
      });
      setInvoices(invMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.admission_number.toLowerCase().includes(term) ||
      getPatientName(r.patient_id, patientNames || []).toLowerCase().includes(term)
    );
  }, [rows, searchTerm, patientNames]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleBillPdf = async (admission: any) => {
    const inv = invoices[admission.id];
    if (!inv) { toast("No invoice found"); return; }
    try {
      await generateDischargeBillPDF({
        invoiceNumber: inv.invoice_number,
        admissionNumber: admission.admission_number,
        patientName: getPatientName(admission.patient_id, patientNames || []),
        wardName: admission.wards?.name,
        bedNumber: admission.beds?.bed_number,
        admissionDate: admission.admission_date,
        dischargeDate: admission.discharge_date,
        days: Math.max(1, Math.ceil((new Date(admission.discharge_date).getTime() - new Date(admission.admission_date).getTime()) / 86400000)),
        items: [],
        subtotal: inv.total_amount + inv.discount,
        discount: inv.discount,
        total: inv.total_amount,
        paid: inv.paid_amount,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discharged Patients ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by admission # or patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchTerm ? `No discharged patients matching "${searchTerm}"` : "No discharged patients yet."}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adm #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Ward / Bed</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Admitted</TableHead>
                      <TableHead>Discharged</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((r: any) => {
                      const inv = invoices[r.id];
                      const days = Math.max(1, Math.ceil((new Date(r.discharge_date || r.updated_at).getTime() - new Date(r.admission_date).getTime()) / 86400000));
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.admission_number}</TableCell>
                          <TableCell>{getPatientName(r.patient_id, patientNames || [])}</TableCell>
                          <TableCell><Badge variant="outline">{r.wards?.name} / Bed {r.beds?.bed_number}</Badge></TableCell>
                          <TableCell className="max-w-xs truncate">{r.final_diagnosis || r.provisional_diagnosis || r.chief_complaint || "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(r.admission_date), "MMM d, HH:mm")}</TableCell>
                          <TableCell className="text-xs">{r.discharge_date ? format(new Date(r.discharge_date), "MMM d, HH:mm") : "—"}</TableCell>
                          <TableCell className="text-xs">
                            {inv ? (
                              <div className="space-y-0.5">
                                <div className="font-medium">{formatPkrAmount(inv.total_amount)}</div>
                                <div className="text-muted-foreground">{inv.status} / Paid: {formatPkrAmount(inv.paid_amount)}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button size="sm" variant="outline" onClick={() => setSummaryFor(r)} className="gap-1">
                                <FileText className="w-3 h-3" />Slip
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setFormFor(r)} className="gap-1">
                                <FileText className="w-3 h-3" />Form
                              </Button>
                              {inv && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setInvoiceViewFor(r)} className="gap-1">
                                    <Eye className="w-3 h-3" />Invoice
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleBillPdf(r)} className="gap-1">
                                    <Download className="w-3 h-3" />Bill PDF
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p >= Math.max(1, currentPage - 2) && p <= Math.min(totalPages, currentPage + 2)).map(p => (
                    <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-1">
                    Next<ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
      {formFor && (
        <AdmissionFormDialog
          open={!!formFor}
          onOpenChange={(o) => !o && setFormFor(null)}
          admission={formFor}
          patientName={getPatientName(formFor.patient_id, patientNames || [])}
        />
      )}
      {summaryFor && (
        <DischargeSummaryDialog
          open={!!summaryFor}
          onOpenChange={(o) => !o && setSummaryFor(null)}
          admission={summaryFor}
          patientName={getPatientName(summaryFor.patient_id, patientNames || [])}
        />
      )}
      {invoiceViewFor && (
        <InvoiceViewDialog
          open={!!invoiceViewFor}
          onOpenChange={(o) => !o && setInvoiceViewFor(null)}
          admission={invoiceViewFor}
        />
      )}
    </Card>
  );
}

function toast(msg: string) {
  import("sonner").then(m => m.toast(msg));
}
