import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { History, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatInPakistanTime } from "@/utils/timezone";
import { generateDailyClosingPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";

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

  // Pagination logic
  const totalPages = Math.ceil((closings?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClosings = closings?.slice(startIndex, endIndex) || [];

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Previous Daily Closings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <div className="text-sm text-gray-600">
            Total closings: <span className="font-semibold">{closings?.length || 0}</span>
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
                        {Array.from({ length: 8 }).map((_, j) => (
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
                          {formatPkrAmount(closing.hospital_revenue)}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {formatPkrAmount(closing.pharmacy_profit)}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{formatPkrAmount(closing.total_expenses)}
                        </TableCell>
                        <TableCell className={`font-medium ${closing.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPkrAmount(closing.net_profit)}
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
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
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
                Showing {startIndex + 1} to {Math.min(endIndex, closings?.length || 0)} of {closings?.length || 0} results
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