
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Banknote, FileText, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";

export default function PatientInvoices() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: patientInvoices = [], isLoading } = useQuery({
    queryKey: ['patient-invoices-page', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', profile.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const handleDownloadInvoice = async (invoice: any) => {
    try {
      // Create invoice data for PDF generation
      const invoiceData = {
        ...invoice,
        patient: {
          users: {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || ''
          }
        }
      };

      await generateInvoicePDF(invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice PDF opened in new tab",
      });
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">View and manage your medical bills</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
            Billing History
          </h2>
        </div>
        
        {/* Mobile view */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : patientInvoices.length > 0 ? (
            <div className="p-4 space-y-4">
              {patientInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-sm">{invoice.invoice_number}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{invoice.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{formatPkrAmount(invoice.amount)}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </div>
                    {invoice.due_date && (
                      <p className="text-xs text-gray-500">
                        Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Banknote className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No invoices found</p>
            </div>
          )}
        </div>

        {/* Desktop view */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patientInvoices.length > 0 ? (
                patientInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{invoice.invoice_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{invoice.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-lg">{formatPkrAmount(invoice.amount)}</span>
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Download PDF
                      </Button>
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
  );
}
