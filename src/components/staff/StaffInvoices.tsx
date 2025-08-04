import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, FileText, Receipt, TestTube, Building2, Eye, Download, ChevronLeft, ChevronRight, Zap, X } from "lucide-react";
import { useInvoices } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';

export function StaffInvoices() {
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch hospital invoices
  const { data: hospitalInvoices, isLoading: hospitalLoading } = useInvoices();

  // Since all invoices are in the main invoices table, we'll filter them directly
  const allTypesInvoices = hospitalInvoices || [];

  const { data: patientNames } = usePatientNames();

  // Combine all invoices and categorize by type based on description/context
  const allInvoices = useMemo(() => {
    const combined: any[] = [];

    // Process all invoices and categorize them
    if (hospitalInvoices) {
      hospitalInvoices.forEach(invoice => {
        // Determine type based on description or other properties
        let type = 'hospital';
        const desc = invoice.description?.toLowerCase() || '';
        
        if (desc.includes('pharmacy') || desc.includes('medicine')) {
          type = 'pharmacy';
        } else if (desc.includes('lab') || desc.includes('test')) {
          type = 'lab';
        } else if (desc.includes('xray') || desc.includes('x-ray') || desc.includes('radiology')) {
          type = 'xray';
        } else if (desc.includes('ot') || desc.includes('operation') || desc.includes('surgery')) {
          type = 'ot';
        }

        combined.push({
          ...invoice,
          type,
          invoice_type: type,
          invoice_date: invoice.created_at,
          patient_name: getPatientName(invoice.patient_id, patientNames || []),
          display_date: format(new Date(invoice.created_at), 'MMM d, yyyy'),
          display_time: format(new Date(invoice.created_at), 'h:mm a'),
          display_amount: formatPkrAmount(invoice.amount)
        });
      });
    }

    return combined.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
  }, [hospitalInvoices, patientNames]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(invoice => {
      const matchesSearch = 
        invoice.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === "all" || invoice.type === filterType;

      const matchesDate = !filterDate || 
        format(new Date(invoice.invoice_date), 'yyyy-MM-dd') === filterDate;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [allInvoices, searchTerm, filterType, filterDate]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (invoice.type === 'pharmacy') {
        await generatePharmacyInvoicePDF(invoice);
      } else if (invoice.type === 'xray') {
        // Use generateInvoicePDF for X-ray invoices
        await generateInvoicePDF(invoice);
      } else {
        await generateInvoicePDF(invoice);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return <Receipt className="w-4 h-4 text-blue-500" />;
      case 'pharmacy':
        return <Receipt className="w-4 h-4 text-green-500" />;
      case 'lab':
        return <TestTube className="w-4 h-4 text-purple-500" />;
      case 'xray':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'ot':
        return <Building2 className="w-4 h-4 text-red-500" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      hospital: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Hospital' },
      pharmacy: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Pharmacy' },
      lab: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', label: 'Lab' },
      xray: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', label: 'X-ray' },
      ot: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'OT' }
    };
    
    const { color, label } = config[type as keyof typeof config] || config.hospital;
    return <Badge className={color}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Overdue' }
    };
    
    const { color, label } = config[status as keyof typeof config] || config.pending;
    return <Badge className={color}>{label}</Badge>;
  };

  const isLoading = hospitalLoading;

  const totalAmount = allInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

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
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">X-ray Invoices</CardTitle>
            <Zap className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {allInvoices.filter(inv => inv.type === 'xray').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied Filters</CardTitle>
            <Search className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
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
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="xray">X-ray</SelectItem>
                <SelectItem value="ot">OT</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10 w-full sm:w-48"
              />
            </div>

            {(searchTerm || filterType !== "all" || filterDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterDate("");
                  setCurrentPage(1);
                }}
                className="px-3"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
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
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={`${invoice.type}-${invoice.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(invoice.type)}
                          <span className="font-medium">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(invoice.type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{invoice.display_date}</div>
                          <div className="text-gray-500">{invoice.display_time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{invoice.display_amount}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          View PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                      {searchTerm || filterType !== "all" || filterDate 
                        ? "No invoices match your search criteria" 
                        : "No invoices found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}