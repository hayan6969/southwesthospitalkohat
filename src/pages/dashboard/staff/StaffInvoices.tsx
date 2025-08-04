
import AppLayout from "@/layouts/AppLayout";
import { useInvoices, useUpdateInvoice } from "@/hooks/useDatabase";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { generateInvoicePDF, generateXrayInvoicePDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { Banknote, FileText, Calendar, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPkrCurrency } from "@/utils/currency";
import { useState } from "react";

export default function StaffInvoices() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();

  // Get pharmacy invoices
  const { data: pharmacyInvoices, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get lab reports for invoicing
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get X-ray reports for invoicing
  const { data: xrayReports, isLoading: xrayLoading } = useQuery({
    queryKey: ['xray-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get OT schedules for invoicing
  const { data: otSchedules, isLoading: otLoading } = useQuery({
    queryKey: ['ot-schedules-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Combine all invoices into a single array with type information
  const allInvoices = [
    ...(hospitalInvoices?.map(inv => ({
      ...inv,
      type: 'hospital',
      typeLabel: 'Hospital Service',
      displayAmount: inv.amount,
      displayNumber: inv.invoice_number,
      displayDate: inv.created_at,
      displayStatus: inv.status
    })) || []),
    ...(pharmacyInvoices?.map(inv => ({
      ...inv,
      type: 'pharmacy',
      typeLabel: 'Pharmacy',
      displayAmount: inv.final_amount,
      displayNumber: inv.invoice_number,
      displayDate: inv.created_at,
      displayStatus: inv.status
    })) || []),
    ...(labReports?.map(lab => ({
      ...lab,
      type: 'lab',
      typeLabel: 'Lab Test',
      displayAmount: lab.price,
      displayNumber: `LAB-${lab.id.slice(0, 8)}`,
      displayDate: lab.created_at,
      displayStatus: lab.status
    })) || []),
    ...(xrayReports?.map(xray => ({
      ...xray,
      type: 'xray',
      typeLabel: 'X-ray',
      displayAmount: xray.price,
      displayNumber: `XR-${xray.id.slice(0, 8)}`,
      displayDate: xray.created_at,
      displayStatus: xray.status
    })) || []),
    ...(otSchedules?.map(ot => ({
      ...ot,
      type: 'ot',
      typeLabel: 'Operation Theater',
      displayAmount: ot.total_cost,
      displayNumber: `OT-${ot.id.slice(0, 8)}`,
      displayDate: ot.created_at,
      displayStatus: ot.status
    })) || [])
  ];

  const isLoading = hospitalLoading || pharmacyLoading || labLoading || xrayLoading || otLoading;

  // Filter invoices based on type and search
  const filteredInvoices = allInvoices.filter(invoice => {
    if (filterType !== 'all' && invoice.type !== filterType) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        invoice.displayNumber.toLowerCase().includes(searchLower) ||
        invoice.typeLabel.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

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

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (invoice.type === 'hospital') {
        await generateInvoicePDF(invoice);
      } else if (invoice.type === 'pharmacy') {
        // Handle pharmacy invoice PDF generation
        const { data: items } = await supabase
          .from('pharmacy_invoice_items')
          .select(`
            *,
            medicines:medicine_id (
              name,
              selling_price
            )
          `)
          .eq('invoice_id', invoice.id);

        const invoiceData = {
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          customer_phone: invoice.customer_phone,
          total_amount: invoice.total_amount,
          discount_amount: invoice.discount_amount || 0,
          final_amount: invoice.final_amount,
          created_at: invoice.created_at,
          items: items?.map(item => ({
            medicine_name: item.medicines?.name || 'Unknown Medicine',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          })) || []
        };

        await generatePharmacyInvoicePDF(invoiceData);
      } else if (invoice.type === 'xray') {
        // For X-ray invoices, use the generateXrayInvoicePDF function
        await generateXrayInvoicePDF({
          invoiceNumber: invoice.displayNumber,
          patientName: "Patient", // This would need patient lookup in real implementation
          patientEmail: "N/A",
          patientId: "N/A",
          patientPhone: "N/A",
          doctorName: invoice.external_doctor_name || "External Doctor",
          tests: [{
            name: invoice.test_name,
            price: invoice.price || 0,
            description: invoice.notes || undefined
          }],
          totalAmount: invoice.price || 0,
          issueDate: format(new Date(invoice.created_at), 'MMM dd, yyyy'),
          xrayDate: format(new Date(invoice.xray_date || invoice.created_at), 'MMM dd, yyyy'),
          notes: invoice.notes
        });
      } else {
        await generateInvoicePDF(invoice);
      }
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
          <div className="p-6 border-b border-gray-200 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              All Invoices ({filteredInvoices.length})
            </h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hospital">Hospital Services</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="lab">Lab Tests</SelectItem>
                  <SelectItem value="xray">X-ray</SelectItem>
                  <SelectItem value="ot">Operation Theater</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
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
                ) : filteredInvoices && filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{invoice.displayNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.type === 'hospital' ? 'default' :
                          invoice.type === 'pharmacy' ? 'secondary' :
                          invoice.type === 'lab' ? 'outline' :
                          invoice.type === 'xray' ? 'default' :
                          invoice.type === 'ot' ? 'destructive' : 'default'
                        }>
                          {invoice.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(new Date(invoice.displayDate), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-lg">{formatPkrCurrency(invoice.displayAmount || 0)}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          invoice.displayStatus === 'paid' || invoice.displayStatus === 'completed' ? 'bg-green-100 text-green-700' :
                          invoice.displayStatus === 'pending' || invoice.displayStatus === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {invoice.displayStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(invoice.displayStatus === 'pending' || invoice.displayStatus === 'scheduled') && invoice.type === 'hospital' && (
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
