import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Eye, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExpenseWithProfile {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  created_by: string;
  creator: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

export function AllExpensesDialog() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch expenses with creator profile information
  const { data: allExpenses, isLoading } = useQuery({
    queryKey: ['all-expenses'],
    queryFn: async () => {
      // First get expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (expensesError) throw expensesError;
      
      // Get unique creator IDs
      const creatorIds = [...new Set(expenses.map(e => e.created_by).filter(Boolean))];
      
      // Get profiles for creators
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', creatorIds);
      
      if (profilesError) throw profilesError;
      
      // Create a map for quick lookup
      const profilesMap = new Map(profiles.map(p => [p.id, p]));
      
      // Combine expenses with creator info
      return expenses.map(expense => ({
        ...expense,
        creator: expense.created_by ? profilesMap.get(expense.created_by) || null : null
      })) as ExpenseWithProfile[];
    }
  });

  // Filter expenses based on search term and date
  const filteredExpenses = allExpenses?.filter(expense => {
    // Text search filter
    let matchesSearch = true;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const creatorEmail = expense.creator?.email?.toLowerCase() || '';
      const creatorName = `${expense.creator?.first_name || ''} ${expense.creator?.last_name || ''}`.toLowerCase();
      const category = expense.category.toLowerCase();
      const description = expense.description.toLowerCase();
      
      matchesSearch = creatorEmail.includes(searchLower) || 
                     creatorName.includes(searchLower) ||
                     category.includes(searchLower) ||
                     description.includes(searchLower);
    }

    // Date filter
    let matchesDate = true;
    if (filterDate) {
      const expenseDate = new Date(expense.expense_date);
      matchesDate = expenseDate.toDateString() === filterDate.toDateString();
    }

    return matchesSearch && matchesDate;
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset page when search or date filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (date: Date | undefined) => {
    setFilterDate(date);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setFilterDate(undefined);
    setCurrentPage(1);
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          View All
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>All Expenses</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by creator email, name, category, or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="max-w-md"
              />
            </div>
            
            <div className="flex items-center gap-2">
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
                    onSelect={handleDateFilterChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              {filterDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateFilter}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold text-red-600">{formatPkrAmount(totalAmount)}</span>
              {(searchTerm || filterDate) && ` (${filteredExpenses.length} results)`}
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Created</TableHead>
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
                  ) : paginatedExpenses.length > 0 ? (
                    paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={expense.description}>
                            {expense.description}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{formatPkrAmount(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {expense.creator?.first_name} {expense.creator?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {expense.creator?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(expense.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {filteredExpenses.length === 0 && (searchTerm || filterDate)
                          ? `No expenses found matching the current filters`
                          : "No expenses found"
                        }
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length} results
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