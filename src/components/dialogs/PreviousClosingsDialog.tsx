import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { History, FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Search, ArrowLeft, Eye } from "lucide-react";
import { format } from "date-fns";
import { formatInPakistanTime } from "@/utils/timezone";
import { generateDailyClosingPDF } from "@/utils/pdfGenerator";
import { DetailedDailyReport } from "@/components/DetailedDailyReport";
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
  const [selectedClosing, setSelectedClosing] = useState<DailyClosing | null>(null);
  const itemsPerPage = 10;

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

  // Fetch staff profiles for operator names in detailed view
  const { data: staffProfiles } = useQuery({
    queryKey: ['staff-profiles-closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['staff', 'admin', 'finance']);
      if (error) throw error;
      return data || [];
    }
  });

  // Filter closings based on date range and search term
  useEffect(() => {
    if (!closings) {
      setFilteredClosings([]);
      return;
    }

    let filtered = [...closings];

    if (startDate && endDate) {
      filtered = filtered.filter(closing => {
        const closingDate = new Date(closing.closing_date);
        return closingDate >= startDate && closingDate <= endDate;
      });
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(closing => 
        closing.day_name?.toLowerCase().includes(search) ||
        format(new Date(closing.closing_date), 'MMM dd, yyyy').toLowerCase().includes(search)
      );
    }

    setFilteredClosings(filtered);
    setCurrentPage(1);
  }, [closings, startDate, endDate, searchTerm]);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
  };

  // Pagination
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

  const handleViewReport = (closing: DailyClosing) => {
    setSelectedClosing(closing);
  };

  const handleBackToList = () => {
    setSelectedClosing(null);
  };

  // Compute summary values for the selected closing
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

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedClosing(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Previous Closings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedClosing && (
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {selectedClosing 
              ? `Daily Report — ${format(new Date(selectedClosing.closing_date), 'EEEE, MMMM d, yyyy')}`
              : 'Previous Daily Closings'
            }
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-4">
            {selectedClosing ? (
              /* ========== DETAILED REPORT VIEW ========== */
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline">{selectedClosing.day_name}</Badge>
                  <span className="text-muted-foreground">
                    Closing Time: {formatInPakistanTime(new Date(selectedClosing.closing_time), 'h:mm a')}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-medium text-green-600">
                    Hos. Revenue: {formatPkrAmount(computeServicesRevenue(selectedClosing.transactions_data) || selectedClosing.hospital_revenue)}
                  </span>
                  <span className="font-medium text-indigo-600">
                    Doc. Revenue: {formatPkrAmount(computeDoctorRevenue(selectedClosing.transactions_data))}
                  </span>
                  <span className="font-medium text-blue-600">
                    Pharmacy Profit: {formatPkrAmount(selectedClosing.pharmacy_profit)}
                  </span>
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" onClick={() => handleViewPDF(selectedClosing)} className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Detailed report using stored transactions_data */}
                {selectedClosing.transactions_data ? (
                  <DetailedDailyReport
                    hospitalInvoices={selectedClosing.transactions_data.hospitalInvoices || []}
                    labReports={selectedClosing.transactions_data.labReports || []}
                    xrayReports={selectedClosing.transactions_data.xrayReports || []}
                    otSchedules={selectedClosing.transactions_data.otSchedules || []}
                    emergencyAppointments={selectedClosing.transactions_data.emergencyAppointments || []}
                    expenses={selectedClosing.transactions_data.expenses || []}
                    refunds={selectedClosing.transactions_data.refunds || []}
                    miscellaneousIncome={selectedClosing.transactions_data.miscellaneousIncome || []}
                    staffProfiles={staffProfiles || []}
                    reportDate={format(new Date(selectedClosing.closing_date), 'EEEE, MMMM d, yyyy')}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No detailed transaction data available for this closing.
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* ========== LIST VIEW ========== */
              <>
                {/* Filters */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1 h-9 text-sm",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {startDate ? format(startDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1 h-9 text-sm",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {endDate ? format(endDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label className="text-xs">Search</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search by day or date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button variant="outline" onClick={clearFilters} className="mt-1 w-full h-9 text-sm">
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground">
                  Total closings: <span className="font-semibold">{closings?.length || 0}</span>
                  {(startDate || endDate || searchTerm) && (
                    <span className="ml-2">(Filtered: <span className="font-semibold">{filteredClosings.length}</span>)</span>
                  )}
                </div>

                {/* Closings list as cards */}
                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="h-16 bg-muted rounded animate-pulse" />
                        </CardContent>
                      </Card>
                    ))
                  ) : paginatedClosings.length > 0 ? (
                    paginatedClosings.map((closing) => {
                      const hosRevenue = computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue;
                      const docRevenue = computeDoctorRevenue(closing.transactions_data);
                      const netProfit = hosRevenue + closing.pharmacy_profit - closing.total_expenses - closing.total_refunds;
                      
                      return (
                        <Card 
                          key={closing.id} 
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => handleViewReport(closing)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-semibold text-sm">
                                    {format(new Date(closing.closing_date), 'MMM dd, yyyy')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{closing.day_name}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatInPakistanTime(new Date(closing.closing_time), 'h:mm a')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-muted-foreground">Hos. Revenue</p>
                                  <p className="text-sm font-semibold text-green-600">{formatPkrAmount(hosRevenue)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-muted-foreground">Doc. Revenue</p>
                                  <p className="text-sm font-semibold text-indigo-600">{formatPkrAmount(docRevenue)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-muted-foreground">Pharmacy</p>
                                  <p className="text-sm font-semibold text-blue-600">{formatPkrAmount(closing.pharmacy_profit)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-muted-foreground">Expenses</p>
                                  <p className="text-sm font-semibold text-red-600">-{formatPkrAmount(closing.total_expenses)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-muted-foreground">Net Profit</p>
                                  <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatPkrAmount(netProfit)}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); handleViewReport(closing); }}
                                    className="h-8 px-2"
                                    title="View detailed report"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); handleViewPDF(closing); }}
                                    className="h-8 px-2"
                                    title="Download PDF"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No previous closings found
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredClosings.length)} of {filteredClosings.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="h-7 text-xs">
                        <ChevronLeft className="h-3 w-3 mr-1" /> Prev
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-7 h-7 p-0 text-xs"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-7 text-xs">
                        Next <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
