import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Download, Receipt, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function FinanceInvoices() {
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterType, setFilterType] = useState<string>("all");
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useInvoices();
  const { toast } = useToast();

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

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (invoice.type === 'hospital') {
        await generateInvoicePDF(invoice);
      } else if (invoice.type === 'pharmacy') {
        await generatePharmacyInvoiceFromData(invoice);
      } else {
        // For lab and OT types, create detailed invoice PDF
        await generateDetailedInvoicePDF(invoice);
      }
      toast({
        title: "Success",
        description: "Invoice opened in new tab",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open invoice",
        variant: "destructive",
      });
    }
  };

  const generatePharmacyInvoiceFromData = async (invoice: any) => {
    // Fetch invoice items for pharmacy invoice
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
  };

  const generateDetailedInvoicePDF = async (invoice: any) => {
    // Get hospital settings for PDF branding
    const getHospitalSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('hospital_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        return {
          hospital_name: 'Medical Center',
          hospital_address: 'Healthcare District',
          contact_number: '+92-XXX-XXXXXXX',
          logo_url: null
        };
      }
    };

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const settings = await getHospitalSettings();
    
    let yPosition = 20;

    // Hospital logo (if available)
    if (settings.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          img.onload = () => {
            try {
              doc.addImage(img, 'JPEG', 20, yPosition - 5, 30, 20);
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
          img.src = settings.logo_url;
        });
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Hospital name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`${settings.hospital_name}${invoice.type === 'lab' ? ' - Laboratory' : ' - Operation Theater'}`, pageWidth / 2, yPosition + 8, { align: 'center' });
    
    yPosition += 16;
    
    // Hospital address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(settings.hospital_address, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    
    // Contact number
    doc.text(`Phone: ${settings.contact_number}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    
    // Document title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    const title = invoice.type === 'lab' ? 'LAB TEST INVOICE' : 'OPERATION THEATER INVOICE';
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 25;
    
    // Invoice details box
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, yPosition - 5, pageWidth - 30, 60);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    
    // Invoice details
    doc.text('Invoice #:', 20, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.displayNumber, 60, yPosition + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 120, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(invoice.displayDate!), 'MMM dd, yyyy'), 140, yPosition + 5);
    
    yPosition += 10;
    
    if (invoice.type === 'lab') {
      doc.setFont('helvetica', 'bold');
      doc.text('Test Name:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.test_name || 'Lab Test', 70, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Test Date:', 120, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(invoice.test_date || invoice.displayDate!), 'MMM dd, yyyy'), 170, yPosition + 5);
      
      yPosition += 10;
      
      if (invoice.external_doctor_name) {
        doc.setFont('helvetica', 'bold');
        doc.text('Referred by:', 20, yPosition + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.external_doctor_name, 75, yPosition + 5);
      }
    } else if (invoice.type === 'ot') {
      doc.setFont('helvetica', 'bold');
      doc.text('Operation Date:', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(invoice.operation_date), 'MMM dd, yyyy'), 85, yPosition + 5);
      
      if (invoice.doctor_name) {
        doc.setFont('helvetica', 'bold');
        doc.text('Doctor:', 120, yPosition + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.doctor_name, 155, yPosition + 5);
      }
      
      yPosition += 10;
      
      if (invoice.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Procedure:', 20, yPosition + 5);
        doc.setFont('helvetica', 'normal');
        const notes = invoice.notes.length > 40 ? invoice.notes.substring(0, 37) + '...' : invoice.notes;
        doc.text(notes, 70, yPosition + 5);
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 20, yPosition + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.displayStatus.toUpperCase(), 55, yPosition + 15);
    
    yPosition += 70;
    
    // Service details
    const tableStartY = yPosition;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Description', 20, yPosition + 7);
    doc.text('Amount', pageWidth - 50, yPosition + 7);
    
    yPosition += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const description = invoice.type === 'lab' ? `Lab Test: ${invoice.test_name || 'Laboratory Service'}` : 'Operation Theater Service';
    doc.text(description, 20, yPosition);
    doc.text(formatPkrAmount(invoice.displayAmount || 0), pageWidth - 50, yPosition);
    
    yPosition += 8;
    
    // Draw table border
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
    doc.line(pageWidth - 70, tableStartY, pageWidth - 70, yPosition);
    
    yPosition += 20;
    
    // Total section
    const totalsX = pageWidth - 85;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.rect(totalsX, yPosition - 5, 80, 18);
    doc.text('Total Amount:', totalsX + 5, yPosition + 4);
    doc.text(formatPkrAmount(invoice.displayAmount || 0), totalsX + 5, yPosition + 12);
    
    yPosition += 30;
    
    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });
    doc.text('For any queries, please contact us at the above number.', pageWidth / 2, yPosition + 8, { align: 'center' });
    
    // Open in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  // Combine all invoices into a single array with type information
  const allInvoices = [
    ...(hospitalInvoices?.map(inv => {
      // Check if this is an emergency consultation
      const isEmergency = inv.description?.toLowerCase().includes('emergency');
      
      return {
        ...inv,
        type: isEmergency ? 'emergency' : 'hospital',
        typeLabel: isEmergency ? 'Emergency' : 'Hospital Service',
        displayAmount: inv.amount,
        displayNumber: inv.invoice_number,
        displayDate: inv.created_at,
        displayStatus: inv.status
      };
    }) || []),
    ...(pharmacyInvoices?.map(inv => ({
      ...inv,
      type: 'pharmacy',
      typeLabel: 'Pharmacy',
      displayAmount: inv.final_amount,
      displayNumber: inv.invoice_number,
      displayDate: inv.created_at,
      displayStatus: 'completed'
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

  // Filter invoices based on selected filters
  const filteredInvoices = allInvoices.filter(invoice => {
    // Filter by type
    if (filterType !== 'all' && invoice.type !== filterType) return false;
    
    // Filter by date
    if (filterDate) {
      const invoiceDate = new Date(invoice.displayDate!);
      return invoiceDate.toDateString() === filterDate.toDateString();
    }
    
    return true;
  }).sort((a, b) => new Date(b.displayDate!).getTime() - new Date(a.displayDate!).getTime());

  // Calculate totals
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.displayAmount || 0), 0);
  const totalCount = filteredInvoices.length;

  if (hospitalLoading || pharmacyLoading || labLoading || otLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Filter Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {filterType === 'all' ? 'All Types' : 
               filterType === 'hospital' ? 'Hospital Services' :
               filterType === 'emergency' ? 'Emergency' :
               filterType === 'pharmacy' ? 'Pharmacy' :
               filterType === 'lab' ? 'Lab Tests' :
               filterType === 'ot' ? 'OT Services' : 'All Types'}
              {filterDate && ` • ${format(filterDate, 'MMM dd, yyyy')}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Invoices
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hospital">Hospital Services</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="lab">Lab Tests</SelectItem>
                <SelectItem value="ot">Operation Theater</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-48 justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {(filterType !== 'all' || filterDate) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilterType('all');
                  setFilterDate(undefined);
                }}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice, index) => (
                <TableRow key={`${invoice.type}-${invoice.id}`}>
                  <TableCell className="font-mono">{invoice.displayNumber}</TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.type === 'hospital' ? 'default' :
                      invoice.type === 'pharmacy' ? 'secondary' :
                      invoice.type === 'lab' ? 'outline' :
                      invoice.type === 'ot' ? 'destructive' : 'default'
                    }>
                      {invoice.typeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPkrAmount(invoice.displayAmount || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.displayStatus === 'paid' || invoice.displayStatus === 'completed' ? 'default' : 
                      invoice.displayStatus === 'pending' ? 'secondary' :
                      invoice.displayStatus === 'scheduled' ? 'outline' : 'secondary'
                    }>
                      {invoice.displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(invoice.displayDate!), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadPDF(invoice)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No invoices found with the selected filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}