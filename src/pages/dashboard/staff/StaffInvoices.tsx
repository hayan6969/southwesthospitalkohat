
import AppLayout from "@/layouts/AppLayout";
import { usePaginatedInvoices, usePaginatedPharmacyInvoices, useUpdateInvoice } from "@/hooks/useDatabase";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { generateInvoicePDF, generateXrayInvoicePDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { Banknote, FileText, Calendar, CheckCircle, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Get ALL hospital invoices (no pagination) for proper filtering
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useQuery({
    queryKey: ['hospital-invoices-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
  
  const updateInvoice = useUpdateInvoice();

  // Get ALL pharmacy invoices (no pagination) for proper filtering
  const { data: pharmacyInvoices, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-invoices-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get lab reports for invoicing (only those without linked invoices)
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .is('invoice_id', null)  // Only get lab reports that aren't linked to hospital invoices
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get X-ray reports for invoicing (only those without linked invoices)
  const { data: xrayReports, isLoading: xrayLoading } = useQuery({
    queryKey: ['xray-reports-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .is('invoice_id', null)  // Only get X-ray reports that aren't linked to hospital invoices
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get OT schedules for invoicing
  const { data: otSchedules, isLoading: otLoading, error: otError } = useQuery({
    queryKey: ['ot-schedules-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('OT Schedules query error:', error);
        throw error;
      }
      console.log('OT Schedules fetched:', data?.length, data);
      return data;
    }
  });

  // Combine all invoices into a single array with type information
  const allInvoices = [
    ...(hospitalInvoices?.map(inv => {
      // Check for emergency consultations first (most specific)
      let type = 'appointment';
      let typeLabel = 'Appointment';
      
      // Emergency consultation detection - check description, emergency_patient_data, AND invoice number patterns
      if (inv.description?.toLowerCase().includes('emergency consultation') || 
          inv.description?.toLowerCase().includes('emergency') ||
          inv.emergency_patient_data ||
          inv.invoice_number?.startsWith('EMG-') ||
          inv.invoice_number?.startsWith('EMERGENCY-')) {
        type = 'emergency';
        typeLabel = 'Emergency Consultation';
      }
      // Check for other invoice number prefixes
      else if (inv.invoice_number?.startsWith('OT-')) {
        type = 'ot';
        typeLabel = 'Operation Theater';
      } else if (inv.invoice_number?.startsWith('LAB-')) {
        type = 'lab';
        typeLabel = 'Lab Test';
      } else if (inv.invoice_number?.startsWith('XRAY-')) {
        type = 'xray';
        typeLabel = 'X-ray';
      }
      
      // Debug specific invoice
      if (inv.invoice_number === 'INV-1754351253847') {
        console.log('🏥 HOSPITAL SOURCE - INV-1754351253847:', { type, typeLabel, description: inv.description });
      }
      
      return {
        ...inv,
        type,
        typeLabel,
        displayAmount: inv.amount,
        displayNumber: inv.invoice_number,
        displayDate: inv.created_at,
        displayStatus: inv.status,
        source: 'hospital' // Add source tracking
      };
    }) || []),
    ...(pharmacyInvoices?.map(inv => {
      if (inv.invoice_number === 'INV-1754351253847') {
        console.log('💊 PHARMACY SOURCE - INV-1754351253847');
      }
      return {
        ...inv,
        type: 'pharmacy',
        typeLabel: 'Pharmacy',
        displayAmount: inv.final_amount,
        displayNumber: inv.invoice_number,
        displayDate: inv.created_at,
        displayStatus: inv.status,
        source: 'pharmacy'
      };
    }) || []),
    ...(labReports?.map(lab => {
      const displayNumber = `LAB-${lab.id.slice(0, 8)}`;
      if (displayNumber === 'INV-1754351253847' || lab.id === 'INV-1754351253847') {
        console.log('🧪 LAB SOURCE - Found match:', { 
          id: lab.id, 
          displayNumber, 
          originalData: lab 
        });
      }
      return {
        ...lab,
        type: 'lab',
        typeLabel: 'Lab Test',
        displayAmount: lab.price,
        displayNumber,
        displayDate: lab.created_at,
        displayStatus: lab.status,
        source: 'lab'
      };
    }) || []),
    ...(xrayReports?.map(xray => {
      const displayNumber = `XR-${xray.id.slice(0, 8)}`;
      if (displayNumber === 'INV-1754351253847') {
        console.log('📷 XRAY SOURCE - INV-1754351253847');
      }
      return {
        ...xray,
        type: 'xray',
        typeLabel: 'X-ray',
        displayAmount: xray.price,
        displayNumber,
        displayDate: xray.created_at,
        displayStatus: xray.status,
        source: 'xray'
      };
    }) || []),
    ...(otSchedules?.map(ot => {
      const displayNumber = `OT-${ot.id.slice(0, 8)}`;
      console.log('Mapping OT Schedule:', { 
        id: ot.id, 
        displayNumber, 
        total_cost: ot.total_cost, 
        status: ot.status 
      });
      return {
        ...ot,
        type: 'ot',
        typeLabel: 'Operation Theater',
        displayAmount: ot.total_cost,
        displayNumber,
        displayDate: ot.created_at,
        displayStatus: ot.status,
        source: 'ot'
      };
    }) || [])
  ];

  const isLoading = hospitalLoading || pharmacyLoading || labLoading || xrayLoading || otLoading;
  
  // Debug OT error
  if (otError) {
    console.error('OT query error:', otError);
  }
  
  console.log('OT Schedules data:', otSchedules);
  console.log('OT Loading:', otLoading);
  console.log('OT Error:', otError);
  
  // Final check - find where INV-1754351253847 ended up
  const targetInvoice = allInvoices.find(inv => inv.displayNumber === 'INV-1754351253847');
  if (targetInvoice) {
    console.log('🎯 FINAL RESULT - INV-1754351253847:', {
      source: (targetInvoice as any).source,
      type: targetInvoice.type,
      typeLabel: targetInvoice.typeLabel
    });
  }

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
  }).sort((a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
  
  console.log('All invoices count:', allInvoices.length);
  console.log('OT invoices in all:', allInvoices.filter(inv => inv.type === 'ot').length);
  console.log('Filtered invoices:', filteredInvoices.length);
  console.log('Filter type:', filterType);

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

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
      if (invoice.type === 'appointment' || invoice.type === 'emergency') {
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
        // For X-ray invoices, fetch patient and doctor data for proper PDF generation
        const [patientRes, patientProfileRes, doctorRes] = await Promise.all([
          supabase.from('patients').select('patient_number').eq('id', invoice.patient_id).single(),
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', invoice.patient_id).single(),
          invoice.doctor_id ? 
            supabase.from('profiles').select('first_name, last_name').eq('id', invoice.doctor_id).single() :
            Promise.resolve({ data: null })
        ]);

        const patientNumber = patientRes.data?.patient_number || 'N/A';
        const patientProfile = patientProfileRes.data;
        const patientName = patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 'Unknown Patient';
        const doctorProfile = doctorRes.data;
        const doctorName = invoice.external_doctor_name || 
          (doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : 'External Doctor');

        await generateXrayInvoicePDF({
          invoiceNumber: invoice.displayNumber,
          patientName: patientName,
          patientEmail: 'Not provided',
          patientId: patientNumber,
          patientPhone: patientProfile?.phone || 'Not provided',
          doctorName: doctorName,
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
                  <SelectItem value="appointment">Appointments</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
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
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedInvoices && paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{invoice.displayNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.type === 'appointment' ? 'default' :
                          invoice.type === 'emergency' ? 'destructive' :
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
                          {(invoice.displayStatus === 'pending' || invoice.displayStatus === 'scheduled') && (invoice.type === 'appointment' || invoice.type === 'emergency') && (
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
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                      {filteredInvoices.length === 0 && searchTerm 
                        ? `No invoices found matching "${searchTerm}"`
                        : filteredInvoices.length === 0 && filterType !== 'all'
                        ? `No ${filterType} invoices found`
                        : "No invoices found"
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && <span className="px-2">...</span>}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
