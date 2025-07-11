import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { formatPkrCurrency } from "@/utils/currency";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { useInvoiceItems } from "@/hooks/useDatabase";

interface PharmacyInvoice {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount_amount: number | null;
  final_amount: number;
  status: string | null;
  created_at: string;
}

interface PharmacyInvoiceDetailsDialogProps {
  invoice: PharmacyInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PharmacyInvoiceDetailsDialog({
  invoice,
  open,
  onOpenChange,
}: PharmacyInvoiceDetailsDialogProps) {
  const { data: invoiceItems = [] } = useInvoiceItems(invoice?.id);

  const handleGeneratePDF = async () => {
    if (!invoice) return;

    const invoiceData = {
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      total_amount: invoice.total_amount,
      discount_amount: invoice.discount_amount,
      final_amount: invoice.final_amount,
      created_at: invoice.created_at,
      items: invoiceItems.map(item => ({
        medicine_name: item.medicine_name || 'Unknown Medicine',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    };

    await generatePharmacyInvoicePDF(invoiceData);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Details - {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Customer Information</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Name:</span> {invoice.customer_name || "Walk-in Customer"}
              </p>
              {invoice.customer_phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {invoice.customer_phone}
                </p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Invoice Information</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date:</span> {new Date(invoice.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status:</span>{" "}
                <Badge variant="secondary" className="ml-1">
                  {invoice.status || "Completed"}
                </Badge>
              </p>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.medicine_name || 'Unknown Medicine'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPkrCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPkrCurrency(item.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Invoice Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatPkrCurrency(invoice.total_amount)}</span>
                </div>
                {invoice.discount_amount && invoice.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-red-600">-{formatPkrCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPkrCurrency(invoice.final_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleGeneratePDF}>
              <Eye className="w-4 h-4 mr-2" />
              View PDF
            </Button>
            <Button onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}