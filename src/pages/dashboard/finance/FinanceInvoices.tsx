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
      } else {
        // For other types, create a simple invoice PDF and open in new tab
        await generateGenericInvoicePDF(invoice);
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

  const generateGenericInvoicePDF = async (invoice: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, 30, { align: 'center' });
    
    // Invoice details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    let yPos = 50;
    
    doc.text(`Invoice #: ${invoice.displayNumber}`, 20, yPos);
    doc.text(`Date: ${format(new Date(invoice.displayDate!), 'MMM dd, yyyy')}`, 20, yPos + 10);
    doc.text(`Type: ${invoice.typeLabel}`, 20, yPos + 20);
    doc.text(`Amount: ${formatPkrAmount(invoice.displayAmount || 0)}`, 20, yPos + 30);
    doc.text(`Status: ${invoice.displayStatus}`, 20, yPos + 40);
    
    // Additional details based on type
    if (invoice.type === 'pharmacy') {
      if (invoice.customer_name) {
        doc.text(`Customer: ${invoice.customer_name}`, 20, yPos + 50);
      }
      if (invoice.customer_phone) {
        doc.text(`Phone: ${invoice.customer_phone}`, 20, yPos + 60);
      }
    } else if (invoice.type === 'lab') {
      if (invoice.test_name) {
        doc.text(`Test: ${invoice.test_name}`, 20, yPos + 50);
      }
    } else if (invoice.type === 'ot') {
      if (invoice.operation_date) {
        doc.text(`Operation Date: ${format(new Date(invoice.operation_date), 'MMM dd, yyyy')}`, 20, yPos + 50);
      }
    }
    
    // Open in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

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