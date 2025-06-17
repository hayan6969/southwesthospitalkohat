
import AppLayout from "@/layouts/AppLayout";
import { useInvoices, useUpdateInvoice } from "@/hooks/useDatabase";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { DollarSign, FileText, Calendar, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StaffInvoices() {
  const { data: invoices, isLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        status: 'paid',
        paid_at: new Date().toISOString()
      });
      toast.success('Invoice marked as paid');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleDownloadPDF = (invoice: any) => {
    try {
      generateInvoicePDF(invoice);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 mt-1">Manage patient billing and payments</p>
          </div>
          <InvoiceDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              All Invoices
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices && invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invoice.patient?.users?.first_name} {invoice.patient?.users?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.patient?.users?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-lg">${invoice.amount}</span>
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {invoice.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              disabled={updateInvoice.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
