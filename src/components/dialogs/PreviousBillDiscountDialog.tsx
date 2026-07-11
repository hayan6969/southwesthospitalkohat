import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { format } from "date-fns";
import { ReceiptText, Search, ArrowDownRight } from "lucide-react";
import { generateRefundReceiptPDF } from "@/utils/pdfGenerator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviousBillDiscountDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [reason, setReason] = useState("");
  // Who instructed / authorized this discount (separate from the operator who
  // processes it — captured into the invoice so it shows in the audit trail).
  const [authorizedBy, setAuthorizedBy] = useState("");

  // Search paid invoices (also fetch created_by for staff attribution)
  const { data: invoices, isLoading: searching } = useQuery({
    queryKey: ["search-paid-invoices", invoiceSearch],
    queryFn: async () => {
      if (!invoiceSearch || invoiceSearch.length < 2) return [];

      const { data: invData, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, description, patient_id, doctor_id, created_at, status, paid_at, created_by")
        .eq("status", "paid")
        .ilike("invoice_number", `%${invoiceSearch}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!invData || invData.length === 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .or(`first_name.ilike.%${invoiceSearch}%,last_name.ilike.%${invoiceSearch}%`)
          .limit(20);

        if (profiles && profiles.length > 0) {
          const patientIds = profiles.map((p) => p.id);
          const { data: invByPatient } = await supabase
            .from("invoices")
            .select("id, invoice_number, amount, description, patient_id, doctor_id, created_at, status, paid_at, created_by")
            .eq("status", "paid")
            .in("patient_id", patientIds)
            .order("created_at", { ascending: false })
            .limit(20);

          if (invByPatient && invByPatient.length > 0) {
            return await enrichInvoices(invByPatient);
          }
        }
        return [];
      }

      return await enrichInvoices(invData);
    },
    enabled: invoiceSearch.length >= 2,
  });

  // Helper to enrich invoices with patient + creator profile data
  const enrichInvoices = async (invData: any[]) => {
    const patientIds = [...new Set(invData.map((i) => i.patient_id))];
    const creatorIds = [...new Set(invData.map((i) => i.created_by).filter(Boolean))] as string[];

    const [profilesRes, patientsRes, creatorsRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, phone").in("id", patientIds),
      supabase.from("patients").select("id, patient_number").in("id", patientIds),
      creatorIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name").in("id", creatorIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    return invData.map((inv) => ({
      ...inv,
      profile: profilesRes.data?.find((p) => p.id === inv.patient_id),
      patient: patientsRes.data?.find((p) => p.id === inv.patient_id),
      creator: creatorsRes.data?.find((c: any) => c.id === inv.created_by),
    }));
  };

  const discountAmount =
    selectedInvoice && discountValue
      ? discountType === "percentage"
        ? Math.round((selectedInvoice.amount * Number(discountValue)) / 100)
        : Math.min(Number(discountValue), selectedInvoice.amount)
      : 0;

  const inferServiceType = (invoice: any) => {
    const invoiceNumber = (invoice?.invoice_number || "").toLowerCase();
    const description = (invoice?.description || "").toLowerCase();

    // Pathology billing writes PATH-INV-… / "Lab: …"; older flow writes LAB-….
    // Use a word boundary so "labor"/"laboratory note" on a consultation isn't
    // misread as a lab invoice (which would skip the doctor-earnings adjustment).
    if (
      invoiceNumber.startsWith("lab-") ||
      invoiceNumber.startsWith("path-inv-") ||
      /\blab\b|pathology/.test(description)
    ) return "lab";
    if (invoiceNumber.startsWith("xr-") || invoiceNumber.startsWith("xray-") || description.includes("x-ray") || description.includes("xray")) return "xray";
    if (invoiceNumber.startsWith("ot-") || description.includes("ot procedure") || description.includes("operation") || description.includes("surgery")) return "ot";

    return "consultation";
  };

  // Process discount → create refund → generate PDF receipt
  const processDiscount = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice || !discountValue || discountAmount <= 0) {
        throw new Error("Please select an invoice and enter a valid discount");
      }
      if (discountType === "percentage" && Number(discountValue) > 100) {
        throw new Error("Percentage cannot exceed 100");
      }

      const discountLabel =
        discountType === "percentage"
          ? `${discountValue}% discount`
          : `Rs. ${discountValue} flat discount`;

      const patientName = selectedInvoice.profile
        ? `${selectedInvoice.profile.first_name} ${selectedInvoice.profile.last_name}`
        : "Unknown";

      const billedByStaff = selectedInvoice.creator
        ? `${selectedInvoice.creator.first_name} ${selectedInvoice.creator.last_name}`
        : "N/A";

      const processedByStaff = profile
        ? `${profile.first_name} ${profile.last_name}`
        : "N/A";

      const processedAt = new Date().toISOString();
      // Re-fetch the current invoice amount to avoid applying a discount on
      // top of stale cached data (which caused the "second discount doubled"
      // effect users reported).
      const { data: freshInv, error: freshErr } = await supabase
        .from("invoices")
        .select("amount")
        .eq("id", selectedInvoice.id)
        .maybeSingle();
      if (freshErr) throw freshErr;
      const currentAmount = Number(freshInv?.amount ?? selectedInvoice.amount);
      const effectiveDiscount =
        discountType === "percentage"
          ? Math.round((currentAmount * Number(discountValue)) / 100)
          : Math.min(Number(discountValue), currentAmount);
      const newInvoiceAmount = Math.max(0, currentAmount - effectiveDiscount);
      const serviceType = inferServiceType(selectedInvoice);
      const recordedDiscountValue = discountType === "percentage" ? Number(discountValue) : effectiveDiscount;

      const [refundResult, invoiceUpdateResult, discountRecordResult] = await Promise.all([
        supabase.from("refunds").insert({
          amount: discountAmount,
          refund_type: "discount_adjustment",
          description: `Discount on previous bill ${selectedInvoice.invoice_number} - ${discountLabel}. Patient: ${patientName}. Billed by: ${billedByStaff}. Authorized by: ${authorizedBy.trim() || "N/A"}. Reason: ${reason || "N/A"}`,
          patient_id: selectedInvoice.patient_id,
          related_record_id: selectedInvoice.id,
          processed_by: profile?.id,
        }),
        supabase.from("invoices").update({
          amount: newInvoiceAmount,
          description: `${selectedInvoice.description || ''} [Adjusted: ${discountLabel}, Refund: ${formatPkrAmount(discountAmount)}]${authorizedBy.trim() ? ` [Authorized by: ${authorizedBy.trim()}]` : ''}`,
        }).eq("id", selectedInvoice.id),
        supabase.from("patient_discounts").insert({
          patient_id: selectedInvoice.patient_id,
          discount_type: discountType,
          discount_value: recordedDiscountValue,
          service_type: serviceType,
          expires_at: processedAt,
          used_at: processedAt,
          is_active: false,
          notes: `Previous bill adjustment for ${selectedInvoice.invoice_number}${reason ? ` - ${reason}` : ''}`,
          created_by: profile?.id || null,
        }),
      ]);

      if (refundResult.error) throw refundResult.error;
      if (discountRecordResult.error) throw discountRecordResult.error;
      if (invoiceUpdateResult.error) {
        console.error("Failed to update invoice amount:", invoiceUpdateResult.error);
      }

      // ── Adjust doctor earnings for consultation discounts ──────────────
      if (serviceType === "consultation" && selectedInvoice.doctor_id && discountAmount > 0) {
        const invoiceDate = new Date(selectedInvoice.paid_at || selectedInvoice.created_at);
        const dateStr = invoiceDate.toISOString().split("T")[0];
        const { data: dp } = await supabase
          .from("doctor_payments")
          .select("id, consultation_earnings, total_earnings")
          .eq("doctor_id", selectedInvoice.doctor_id)
          .eq("period_start", dateStr)
          .eq("period_end", dateStr)
          .eq("payment_status", "pending")
          .maybeSingle();
        if (dp) {
          const newConsultEarnings = Math.max(0, Number(dp.consultation_earnings) - discountAmount);
          const newTotalEarnings = Math.max(0, Number(dp.total_earnings) - discountAmount);
          await supabase
            .from("doctor_payments")
            .update({
              consultation_earnings: newConsultEarnings,
              total_earnings: newTotalEarnings,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dp.id);
        }
      }

      // ── Update lab_pathology_reports.amount for lab discounts ─────
      if (serviceType === "lab" && discountAmount > 0) {
        // Exact path: reports linked to THIS invoice (set at report creation or
        // backfilled via the order link). No date/patient guessing.
        const { data: linked } = await supabase
          .from("lab_pathology_reports")
          .update({ amount: newInvoiceAmount } as any)
          .eq("invoice_id", selectedInvoice.id)
          .select("id");
        // Fallback for legacy reports with no invoice link: same patient + same
        // day, but ONLY unlinked rows so we never clobber another invoice's
        // report on the same day.
        if (!linked || linked.length === 0) {
          const invoiceDate = new Date(selectedInvoice.paid_at || selectedInvoice.created_at);
          const dateStr = invoiceDate.toISOString().split("T")[0];
          await supabase
            .from("lab_pathology_reports")
            .update({ amount: newInvoiceAmount } as any)
            .is("invoice_id", null)
            .eq("patient_id", selectedInvoice.patient_id)
            .gte("created_at", dateStr + "T00:00:00")
            .lte("created_at", dateStr + "T23:59:59");
        }
      }

      await generateRefundReceiptPDF({
        invoiceNumber: selectedInvoice.invoice_number,
        patientName,
        patientPhone: selectedInvoice.profile?.phone || "N/A",
        patientId: selectedInvoice.patient?.patient_number || "N/A",
        originalAmount: selectedInvoice.amount,
        discountLabel,
        refundAmount: discountAmount,
        reason: reason || "N/A",
        billedByStaff,
        processedByStaff,
        originalDate: selectedInvoice.paid_at || selectedInvoice.created_at,
        description: selectedInvoice.description || "",
      });
    },
    onSuccess: () => {
      // Broad invalidation so lab register + all finance/analytics views
      // reflect the discount immediately (previously stale caches made the
      // first discount look ignored until a second one flushed the data).
      [
        "search-paid-invoices",
        "refunds",
        "patient-discounts",
        "all-patient-discounts",
        "invoices",
        "daily-finance",
        "daily-detailed",
        "financial-analytics",
        "admin-finance-analytics",
        "lab_register",
        "lab-pathology-reports",
        "pathology-reports",
        "doctor-payments",
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      // Force-refetch anything currently mounted so the UI updates without
      // waiting for a manual reload.
      queryClient.refetchQueries({ type: "active" });
      toast.success(
        `Refund of ${formatPkrAmount(discountAmount)} created. Patient can collect cash from the counter.`
      );
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to process discount"),
  });

  const resetForm = () => {
    setInvoiceSearch("");
    setSelectedInvoice(null);
    setDiscountType("percentage");
    setDiscountValue("");
    setReason("");
    setAuthorizedBy("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="z-[9999] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5" />
            Discount on Previous Bill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Search invoice */}
          <div className="space-y-2">
            <Label>Search Paid Invoice</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or patient name..."
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  setSelectedInvoice(null);
                }}
                className="pl-9"
              />
            </div>

            {invoices && invoices.length > 0 && !selectedInvoice && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Patient</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow
                        key={inv.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setInvoiceSearch(inv.invoice_number);
                        }}
                      >
                        <TableCell className="text-xs font-mono">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">
                          {inv.profile?.first_name} {inv.profile?.last_name}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{formatPkrAmount(inv.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(inv.created_at), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {invoiceSearch.length >= 2 && !searching && invoices?.length === 0 && !selectedInvoice && (
              <p className="text-sm text-muted-foreground text-center py-2">No paid invoices found</p>
            )}
          </div>

          {/* Selected invoice detail */}
          {selectedInvoice && (
            <div className="p-3 bg-muted/50 rounded-lg border space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectedInvoice.profile?.first_name} {selectedInvoice.profile?.last_name}
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedInvoice.invoice_number}
                </Badge>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{selectedInvoice.description}</span>
                <span className="font-semibold text-foreground">{formatPkrAmount(selectedInvoice.amount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Paid on {format(new Date(selectedInvoice.paid_at || selectedInvoice.created_at), "dd MMM yyyy, hh:mm a")}
                {selectedInvoice.creator && (
                  <> · Billed by: <span className="font-medium">{selectedInvoice.creator.first_name} {selectedInvoice.creator.last_name}</span></>
                )}
              </p>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => { setSelectedInvoice(null); setInvoiceSearch(""); }}>
                Change Invoice
              </Button>
            </div>
          )}

          {/* Step 2: Discount details */}
          {selectedInvoice && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (Rs.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    min="0"
                    max={discountType === "percentage" ? 100 : selectedInvoice.amount}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Authorized / Instructed By</Label>
                <Input
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="Who instructed / approved this discount? (e.g. Dr. Musarrat, MS)"
                />
                <p className="text-xs text-muted-foreground">
                  Recorded on the invoice and shown in the Invoice Audit Trail — distinct from the operator processing it.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason for Discount</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this discount being given on a previous bill?"
                  rows={2}
                />
              </div>

              {/* Refund preview */}
              {discountAmount > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-green-700 font-medium text-sm">
                    <ArrowDownRight className="w-4 h-4" />
                    Refund Amount: {formatPkrAmount(discountAmount)}
                  </div>
                  <p className="text-xs text-green-600">
                    Original Bill: {formatPkrAmount(selectedInvoice.amount)} → Discount:{" "}
                    {discountType === "percentage" ? `${discountValue}%` : formatPkrAmount(Number(discountValue))}
                  </p>
                  <p className="text-xs text-green-800 font-medium">
                    Patient will collect {formatPkrAmount(discountAmount)} cash from the billing counter
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => processDiscount.mutate()}
                disabled={!discountValue || discountAmount <= 0 || processDiscount.isPending}
              >
                {processDiscount.isPending ? "Processing..." : `Create Refund of ${formatPkrAmount(discountAmount)}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
