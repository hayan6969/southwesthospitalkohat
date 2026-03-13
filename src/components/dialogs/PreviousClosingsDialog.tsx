import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { History, FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { formatInPakistanTime } from "@/utils/timezone";
import { generateDailyClosingPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyClosing {
  id: string;
  closing_date: string;
  closing_time: string;
  day_name: string;
  hospital_revenue: number;
  pharmacy_revenue: number;
  pharmacy_profit: number;
  total_expenses: number;
  total_refunds: number;
  net_profit: number;
  transactions_data: any;
  created_at: string;
}

export function PreviousClosingsDialog() {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredClosings, setFilteredClosings] = useState<DailyClosing[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Recalculate hospital services revenue from stored transactions_data for accurate display
  const computeServicesRevenue = (td?: any): number => {
    if (!td) return 0;
    const lab = (td.labReports || []).reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
    const xray = (td.xrayReports || []).reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
    const ot = (td.otSchedules || []).reduce((s: number, ot: any) => s + ((Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0)), 0);
    const emergencyAppointments = (td.emergencyAppointments || []).reduce((s: number, e: any) => s + (Number(e.consultation_fee_at_time) || 0), 0);
    const emergencyInvoices = (td.hospitalInvoices || []).filter((inv: any) =>
      inv?.description?.toLowerCase?.().includes('emergency') ||
      inv?.emergency_patient_data ||
      inv?.invoice_number?.startsWith?.('EMG-') ||
      inv?.invoice_number?.startsWith?.('EMERGENCY-')
    );
    const emergencyInvoiceRevenue = emergencyInvoices.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
    const emergency = emergencyAppointments + emergencyInvoiceRevenue;
    const misc = (td.miscellaneousIncome || []).reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
    return lab + xray + ot + emergency + misc;
  };

  // Compute doctor revenue (consultation fees + OT doctor expenses) from transactions_data
  const computeDoctorRevenue = (td?: any): number => {
    if (!td) return 0;
    const hospitalInvoices = td.hospitalInvoices || [];
    const consultationFees = hospitalInvoices
      .filter((inv: any) =>
        inv.invoice_number?.startsWith?.('INV-') &&
        !inv.description?.toLowerCase?.().includes('emergency') &&
        !inv.emergency_patient_data &&
        !inv.invoice_number?.startsWith?.('EMG-') &&
        !inv.invoice_number?.startsWith?.('EMERGENCY-')
      )
      .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
    const otDoctorExpense = (td.otSchedules || []).reduce((s: number, ot: any) => s + (Number(ot.doctor_expense) || 0), 0);
    return consultationFees + otDoctorExpense;
  };

  // Fetch all previous daily closings
  const { data: closings, isLoading } = useQuery({
    queryKey: ['daily-closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_closings')
        .select('*')
        .order('closing_date', { ascending: false })
        .order('closing_time', { ascending: false });
      
      if (error) throw error;
      return data as DailyClosing[];
    }
  });

  // Filter closings based on date range and search term
  useEffect(() => {
    if (!closings) {
      setFilteredClosings([]);
      return;
    }

    let filtered = [...closings];

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(closing => {
        const closingDate = new Date(closing.closing_date);
        return closingDate >= startDate && closingDate <= endDate;
      });
    }

    // Filter by search term (day name or search in data)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(closing => 
        closing.day_name?.toLowerCase().includes(search) ||
        format(new Date(closing.closing_date), 'MMM dd, yyyy').toLowerCase().includes(search)
      );
    }

    setFilteredClosings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [closings, startDate, endDate, searchTerm]);

  // Clear filters function
  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
  };

  // Pagination logic for filtered data
  const totalPages = Math.ceil(filteredClosings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClosings = filteredClosings.slice(startIndex, endIndex);

  const handleViewPDF = async (closing: DailyClosing) => {
    try {
      await generateDailyClosingPDF({
        closingDate: closing.closing_date,
        closingTime: closing.closing_time,
        dayName: closing.day_name,
        hospitalRevenue: closing.hospital_revenue,
        pharmacyRevenue: closing.pharmacy_revenue,
        pharmacyProfit: closing.pharmacy_profit,
        totalExpenses: closing.total_expenses,
        totalRefunds: closing.total_refunds,
        netProfit: closing.net_profit,
        transactionsData: closing.transactions_data || {}
      });
      
      toast.success("Daily closing PDF opened in new tab");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Previous Closings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Previous Daily Closings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Start Date */}
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Search */}
                <div>
                  <Label>Search</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by day or date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="mt-2 w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="text-sm text-gray-600">
            Total closings: <span className="font-semibold">{closings?.length || 0}</span>
            {(startDate || endDate || searchTerm) && (
              <span className="ml-2">
                (Filtered: <span className="font-semibold">{filteredClosings.length}</span>)
              </span>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                   <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Closing Time</TableHead>
                    <TableHead>Hospital Revenue</TableHead>
                    <TableHead>Doctor Revenue</TableHead>
                    <TableHead>Pharmacy Profit</TableHead>
                    <TableHead>Total Expenses</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedClosings.length > 0 ? (
                    paginatedClosings.map((closing) => (
                      <TableRow key={closing.id}>
                        <TableCell className="font-medium">
                          {format(new Date(closing.closing_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{closing.day_name}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatInPakistanTime(new Date(closing.closing_time), 'h:mm a')}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatPkrAmount((() => {
                            const computed = computeServicesRevenue(closing.transactions_data);
                            return computed || closing.hospital_revenue;
                          })())}
                        </TableCell>
                        <TableCell className="font-medium text-indigo-600">
                          {formatPkrAmount(computeDoctorRevenue(closing.transactions_data))}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {formatPkrAmount(closing.pharmacy_profit)}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{formatPkrAmount(closing.total_expenses)}
                        </TableCell>
                        <TableCell className={`font-medium ${(((computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue) + closing.pharmacy_profit - closing.total_expenses - closing.total_refunds) >= 0) ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPkrAmount((computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue) + closing.pharmacy_profit - closing.total_expenses - closing.total_refunds)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPDF(closing)}
                            className="flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            View PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        No previous closings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
               <div className="text-sm text-gray-700">
                 Showing {startIndex + 1} to {Math.min(endIndex, filteredClosings.length)} of {filteredClosings.length} results
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
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
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
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
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
      </DialogContent>
    </Dialog>
  );
}