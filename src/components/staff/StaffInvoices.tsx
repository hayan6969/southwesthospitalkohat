import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, FileText, Receipt, TestTube, Building2, Eye, Download } from "lucide-react";
import { useInvoices, useLabReports } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";

export function StaffInvoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: labReports, isLoading: labLoading } = useLabReports();
  const { data: patientNames } = usePatientNames();

  // Format time to 12-hour format
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPp'); // Example: "Dec 25, 2023 at 2:30 PM"
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Combine all invoices with their types
  const allInvoices = useMemo(() => {
    const combined: any[] = [];

    // Regular invoices (appointments)
    if (invoices) {
      invoices.forEach(invoice => {
        const isLabInvoice = invoice.description && invoice.description.toLowerCase().includes('lab');
        const isOTInvoice = invoice.description && invoice.description.toLowerCase().includes('ot');
        const isEmergencyInvoice = invoice.description && invoice.description.toLowerCase().includes('emergency');
        
        let type = 'appointment';
        if (isEmergencyInvoice) type = 'emergency';
        else if (isLabInvoice) type = 'lab';
        else if (isOTInvoice) type = 'ot';

        combined.push({
          ...invoice,
          type,
          invoice_type: type,
          invoice_date: invoice.created_at,
          patient_name: getPatientName(invoice.patient_id, patientNames || []),
          amount: invoice.amount,
          status: invoice.status
        });
      });
    }

    return combined.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
  }, [invoices, patientNames]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(invoice => {
      const matchesSearch = 
        invoice.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = invoiceTypeFilter === "all" || invoice.type === invoiceTypeFilter;

      const matchesDate = !dateFilter || 
        format(new Date(invoice.invoice_date), 'yyyy-MM-dd') === dateFilter;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [allInvoices, searchTerm, invoiceTypeFilter, dateFilter]);

  const handleViewInvoice = async (invoice: any) => {
    try {
      await generateInvoicePDF(invoice);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <Receipt className="w-4 h-4 text-red-500" />;
      case 'lab':
        return <TestTube className="w-4 h-4" />;
      case 'ot':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      emergency: { color: 'bg-red-100 text-red-700', label: 'Emergency' },
      lab: { color: 'bg-blue-100 text-blue-700', label: 'Lab' },
      ot: { color: 'bg-green-100 text-green-700', label: 'OT' },
      appointment: { color: 'bg-purple-100 text-purple-700', label: 'Appointment' }
    };
    
    const { color, label } = config[type as keyof typeof config] || config.appointment;
    return <Badge className={color}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { color: 'bg-green-100 text-green-700', label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-700', label: 'Overdue' }
    };
    
    const { color, label } = config[status as keyof typeof config] || config.pending;
    return <Badge className={color}>{label}</Badge>;
  };

  const isLoading = invoicesLoading || labLoading;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allInvoices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Invoices</CardTitle>
            <TestTube className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allInvoices.filter(inv => inv.type === 'lab').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OT Invoices</CardTitle>
            <Building2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allInvoices.filter(inv => inv.type === 'ot').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Receipt className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatPkrAmount(allInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="appointment">Appointments</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="lab">Lab Tests</SelectItem>
                <SelectItem value="ot">OT Operations</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-full sm:w-48"
              />
            </div>

            {(searchTerm || invoiceTypeFilter !== "all" || dateFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setInvoiceTypeFilter("all");
                  setDateFilter("");
                }}
                className="px-3"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(invoice.type)}
                          <span className="font-medium">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.patient_name}</div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(invoice.type)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {invoice.description || 'No description'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(invoice.invoice_date), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatPkrAmount(invoice.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInvoice(invoice)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}