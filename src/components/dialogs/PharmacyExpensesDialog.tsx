import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Receipt, DollarSign, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";

interface PharmacyExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PharmacyExpense {
  id: string;
  amount: number;
  expense_type: string;
  description: string;
  bill_number?: string;
  expense_date: string;
  created_at: string;
}

export function PharmacyExpensesDialog({ open, onOpenChange }: PharmacyExpensesDialogProps) {
  const [expenses, setExpenses] = useState<PharmacyExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<PharmacyExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch pharmacy expenses
  useEffect(() => {
    if (open) {
      fetchPharmacyExpenses();
    }
  }, [open]);

  // Filter expenses based on date range and search term
  useEffect(() => {
    let filtered = [...expenses];

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    // Filter by search term (bill number, description, expense type)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(search) ||
        expense.expense_type?.toLowerCase().includes(search) ||
        expense.bill_number?.toLowerCase().includes(search)
      );
    }

    setFilteredExpenses(filtered);
  }, [expenses, startDate, endDate, searchTerm]);

  const fetchPharmacyExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pharmacy_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching pharmacy expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load pharmacy expenses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalHospitalWithdrawals = filteredExpenses
    .filter(expense => expense.expense_type === 'hospital_profit_withdrawal')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalBillPayments = filteredExpenses
    .filter(expense => expense.expense_type === 'bill_payment')
    .reduce((sum, expense) => sum + expense.amount, 0);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px]">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Receipt className="w-7 h-7" />
            Pharmacy Expenses History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                      placeholder="Search by bill number, type..."
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatPkrAmount(totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {filteredExpenses.length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  Hospital Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPkrAmount(totalHospitalWithdrawals)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Profit withdrawals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  Bill Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatPkrAmount(totalBillPayments)}
                </div>
                <p className="text-xs text-muted-foreground">
                  External payments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No expenses found for the selected filters
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Bill Number</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            expense.expense_type === 'hospital_profit_withdrawal' 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-orange-100 text-orange-800"
                          )}>
                            {expense.expense_type === 'hospital_profit_withdrawal' 
                              ? 'Hospital Withdrawal' 
                              : 'Bill Payment'}
                          </span>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          {expense.bill_number ? (
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {expense.bill_number}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          {formatPkrAmount(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}