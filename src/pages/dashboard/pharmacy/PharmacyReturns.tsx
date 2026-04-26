import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { RotateCcw, Search, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount_amount: number | null;
  final_amount: number;
  created_at: string;
};

type InvoiceItemRow = {
  id: string;
  medicine_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  medicines: { id: string; name: string } | null;
  alreadyReturned: number;
  returnQty: number;
};

export default function PharmacyReturns() {
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const discountRatio =
    invoice && invoice.total_amount > 0
      ? Math.max(0, Math.min(1, (invoice.discount_amount || 0) / invoice.total_amount))
      : 0;

  const resetState = () => {
    setInvoice(null);
    setItems([]);
  };

  const lookupInvoice = async () => {
    const q = invoiceQuery.trim();
    if (!q) {
      toast.error("Enter an invoice number");
      return;
    }
    setLoading(true);
    resetState();
    try {
      const { data: inv, error: invErr } = await supabase
        .from("pharmacy_invoices")
        .select("*")
        .eq("invoice_number", q)
        .maybeSingle();

      if (invErr) throw invErr;
      if (!inv) {
        toast.error("Invoice not found");
        return;
      }
      if (inv.final_amount < 0 || inv.customer_name === "RETURN") {
        toast.error("This is a return invoice, not a sale");
        return;
      }

      const { data: itemRows, error: itemErr } = await supabase
        .from("pharmacy_invoice_items")
        .select("id, medicine_id, quantity, unit_price, total_price, medicines(id, name)")
        .eq("invoice_id", inv.id);

      if (itemErr) throw itemErr;

      // Find prior returns for this invoice (linked via notes containing original invoice number)
      const { data: priorReturns } = await supabase
        .from("pharmacy_invoices")
        .select("id")
        .like("invoice_number", `RTN-${inv.invoice_number}-%`);

      const priorIds = (priorReturns || []).map((r) => r.id);
      const returnedMap = new Map<string, number>();
      if (priorIds.length > 0) {
        const { data: priorItems } = await supabase
          .from("pharmacy_invoice_items")
          .select("medicine_id, quantity")
          .in("invoice_id", priorIds);
        (priorItems || []).forEach((pi) => {
          if (!pi.medicine_id) return;
          const prev = returnedMap.get(pi.medicine_id) || 0;
          returnedMap.set(pi.medicine_id, prev + Math.abs(pi.quantity));
        });
      }

      setInvoice(inv as InvoiceRow);
      setItems(
        (itemRows || []).map((r: any) => ({
          id: r.id,
          medicine_id: r.medicine_id,
          quantity: r.quantity,
          unit_price: r.unit_price,
          total_price: r.total_price,
          medicines: r.medicines,
          alreadyReturned: r.medicine_id ? returnedMap.get(r.medicine_id) || 0 : 0,
          returnQty: 0,
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const setReturnQty = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== rowId) return it;
        const maxReturnable = it.quantity - it.alreadyReturned;
        const clamped = Math.max(0, Math.min(maxReturnable, isNaN(value) ? 0 : value));
        return { ...it, returnQty: clamped };
      })
    );
  };

  // Per-line discounted refund (proportional to original line discount share)
  const lineRefund = (it: InvoiceItemRow) =>
    it.returnQty * it.unit_price * (1 - discountRatio);

  const grossReturn = items.reduce((s, it) => s + it.returnQty * it.unit_price, 0);
  const discountShare = grossReturn * discountRatio;
  const netRefund = grossReturn - discountShare;
  const totalReturnQty = items.reduce((s, it) => s + it.returnQty, 0);

  const confirmReturn = async () => {
    if (!invoice) return;
    if (totalReturnQty === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    setIsProcessing(true);
    try {
      const returnInvoiceNumber = `RTN-${invoice.invoice_number}-${Date.now()}`;

      const { data: returnInvoice, error: invoiceError } = await supabase
        .from("pharmacy_invoices")
        .insert({
          invoice_number: returnInvoiceNumber,
          customer_name: invoice.customer_name || "RETURN",
          customer_phone: invoice.customer_phone,
          total_amount: -grossReturn,
          discount_amount: -discountShare,
          final_amount: -netRefund,
          status: "completed",
        })
        .select()
        .single();

      if (invoiceError) throw new Error(`Failed to create return invoice: ${invoiceError.message}`);

      const toReturn = items.filter((it) => it.returnQty > 0);

      for (const it of toReturn) {
        const refund = lineRefund(it);
        const { error: itemError } = await supabase
          .from("pharmacy_invoice_items")
          .insert({
            invoice_id: returnInvoice.id,
            medicine_id: it.medicine_id,
            quantity: -it.returnQty,
            unit_price: it.unit_price,
            total_price: -refund,
          });
        if (itemError) throw new Error(`Failed to record return item: ${itemError.message}`);

        if (it.medicine_id) {
          const { data: med, error: fetchError } = await supabase
            .from("medicines")
            .select("stock_quantity")
            .eq("id", it.medicine_id)
            .single();
          if (fetchError) throw new Error(`Failed to fetch stock: ${fetchError.message}`);

          const { error: stockError } = await supabase
            .from("medicines")
            .update({ stock_quantity: med.stock_quantity + it.returnQty })
            .eq("id", it.medicine_id);
          if (stockError) throw new Error(`Failed to update stock: ${stockError.message}`);
        }
      }

      toast.success(`Return processed. Refund: ${formatPkrAmount(netRefund)}`);
      setInvoiceQuery("");
      resetState();
    } catch (error: any) {
      console.error("Error processing return:", error);
      toast.error(error.message || "Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout sidebarRole="head_pharmacist">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicine Returns</h1>
            <p className="text-gray-600">Look up an invoice and refund selected items</p>
          </div>
        </div>

        {/* Invoice lookup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="e.g. PINV-1234567890"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupInvoice()}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={lookupInvoice} disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? "Loading..." : "Lookup"}
                </Button>
                {invoice && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInvoiceQuery("");
                      resetState();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice details + return selection */}
        {invoice && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice {invoice.invoice_number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium">{invoice.customer_name || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium">{formatPkrAmount(invoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Discount</p>
                  <p className="font-medium">
                    {formatPkrAmount(invoice.discount_amount || 0)}
                    {discountRatio > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({(discountRatio * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Already Returned</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const maxReturnable = it.quantity - it.alreadyReturned;
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          {it.medicines?.name || "Unknown medicine"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPkrAmount(it.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{it.alreadyReturned}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={maxReturnable}
                            value={it.returnQty}
                            disabled={maxReturnable <= 0}
                            onChange={(e) => setReturnQty(it.id, parseInt(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPkrAmount(lineRefund(it))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Separator />

              <div className="space-y-1 text-sm max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross return:</span>
                  <span>{formatPkrAmount(grossReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Discount share ({(discountRatio * 100).toFixed(1)}%):
                  </span>
                  <span>- {formatPkrAmount(discountShare)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-1 border-t">
                  <span>Net refund:</span>
                  <span className="text-orange-600">{formatPkrAmount(netRefund)}</span>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={totalReturnQty === 0 || isProcessing}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {isProcessing ? "Processing..." : "Confirm Return"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Medicine Return</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2">
                        <p>
                          Refund <strong>{formatPkrAmount(netRefund)}</strong> against invoice{" "}
                          <strong>{invoice.invoice_number}</strong>?
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Stock will be increased for returned items</li>
                          <li>A return invoice will be recorded</li>
                          <li>Discount is distributed proportionally — values will not inflate</li>
                          <li>This action cannot be undone</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmReturn}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Confirm Return
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
