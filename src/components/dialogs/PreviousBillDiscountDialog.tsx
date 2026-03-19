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

  // Search paid invoices (also fetch created_by for staff attribution)
  const { data: invoices, isLoading: searching } = useQuery({
    queryKey: ["search-paid-invoices", invoiceSearch],
    queryFn: async () => {
      if (!invoiceSearch || invoiceSearch.length < 2) return [];

      const { data: invData, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, description, patient_id, created_at, status, paid_at, created_by")
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
            .select("id, invoice_number, amount, description, patient_id, created_at, status, paid_at, created_by")
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

      // Create refund entry and update invoice amount in parallel
      const newInvoiceAmount = selectedInvoice.amount - discountAmount;
      const [refundResult, invoiceUpdateResult] = await Promise.all([
        supabase.from("refunds").insert({
          amount: discountAmount,
          refund_type: "discount_adjustment",
          description: `Discount on previous bill ${selectedInvoice.invoice_number} - ${discountLabel}. Patient: ${patientName}. Billed by: ${billedByStaff}. Reason: ${reason || "N/A"}`,
          patient_id: selectedInvoice.patient_id,
          related_record_id: selectedInvoice.id,
          processed_by: profile?.id,
        }),
        // Reduce the invoice amount so revenue stats reflect the actual collected amount
        supabase.from("invoices").update({
          amount: newInvoiceAmount,
          description: `${selectedInvoice.description || ''} [Adjusted: ${discountLabel}, Refund: ${formatPkrAmount(discountAmount)}]`,
        }).eq("id", selectedInvoice.id),
      ]);

      if (refundResult.error) throw refundResult.error;
      if (invoiceUpdateResult.error) {
        console.error("Failed to update invoice amount:", invoiceUpdateResult.error);
      }

      // Generate refund receipt PDF
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
      queryClient.invalidateQueries({ queryKey: ["search-paid-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["patient-discounts"] });
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
