import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { getCurrentPakistanTime } from "@/utils/timezone";
import { Calculator, TrendingUp, DollarSign, Wallet, Minus, Plus, Receipt } from "lucide-react";

interface PharmacyAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PharmacyAccountDialog({ open, onOpenChange }: PharmacyAccountDialogProps) {
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseType, setExpenseType] = useState<string>("hospital_profit_withdrawal");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [pharmacyStats, setPharmacyStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    totalInvestment: 0,
    netBalance: 0
  });
  const { toast } = useToast();

  // Fetch pharmacy account data and calculate stats
  useEffect(() => {
    if (open) {
      fetchPharmacyAccountData();
    }
  }, [open]);

  const fetchPharmacyAccountData = async () => {
    setIsLoading(true);
    try {
      // Fetch starting balance
      const { data: accountData } = await supabase
        .from('pharmacy_account')
        .select('starting_balance')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (accountData) {
        setStartingBalance(accountData.starting_balance || 0);
      }

      // Fetch pharmacy expenses (profit withdrawals)
      const { data: pharmacyExpenses } = await supabase
        .from('pharmacy_expenses')
        .select('amount');

      const totalExpenses = pharmacyExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

      // Calculate pharmacy revenue and profit
      const { data: pharmacyInvoicesWithItems } = await supabase
        .from('pharmacy_invoices')
        .select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            total_price,
            medicine_id,
            medicines(purchase_price, selling_price)
          )
        `);

      let totalRevenue = 0;
      let totalProfit = 0;

      if (pharmacyInvoicesWithItems) {
        // Filter out returns (negative amounts) for revenue calculation
        const positiveInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) >= 0);
        
        // Calculate total revenue from positive sales
        totalRevenue = positiveInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
        
        // Calculate total profit from positive sales only
        totalProfit = positiveInvoices.reduce((totalP, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.selling_price && item.medicines.purchase_price) {
              const profitPerUnit = item.medicines.selling_price - item.medicines.purchase_price;
              return itemsProfit + (profitPerUnit * item.quantity);
            }
            return itemsProfit;
          }, 0);
          return totalP + invoiceProfit;
        }, 0);
      }

      const netBalance = (accountData?.starting_balance || 0) + totalRevenue - totalExpenses;

      setPharmacyStats({
        totalRevenue,
        totalProfit,
        totalExpenses,
        totalInvestment: (accountData?.starting_balance || 0) + totalRevenue,
        netBalance
      });

    } catch (error) {
      console.error('Error fetching pharmacy account data:', error);
      toast({
        title: "Error",
        description: "Failed to load pharmacy account data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStartingBalance = async () => {
    setIsSaving(true);
    try {
      // Check if record exists
      const { data: existingRecord } = await supabase
        .from('pharmacy_account')
        .select('id')
        .limit(1)
        .single();

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('pharmacy_account')
          .update({ 
            starting_balance: startingBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('pharmacy_account')
          .insert({ 
            starting_balance: startingBalance,
            notes: 'Starting balance updated'
          });

        if (error) throw error;
      }

      // Recalculate stats with new starting balance
      setPharmacyStats(prev => ({
        ...prev,
        totalInvestment: startingBalance + prev.totalRevenue,
        netBalance: startingBalance + prev.totalRevenue - prev.totalExpenses
      }));

      toast({
        title: "Success",
        description: "Starting balance updated successfully",
      });

    } catch (error) {
      console.error('Error saving starting balance:', error);
      toast({
        title: "Error",
        description: "Failed to update starting balance",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = async () => {
    if (expenseAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid expense amount",
        variant: "destructive",
      });
      return;
    }

    setIsAddingExpense(true);
    try {
      const { error } = await supabase
        .from('pharmacy_expenses')
        .insert({
          amount: expenseAmount,
          expense_type: expenseType,
          description: expenseType === 'hospital_profit_withdrawal' ? 'Hospital profit withdrawal' : 'Bill payment',
          expense_date: getCurrentPakistanTime().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update stats
      setPharmacyStats(prev => ({
        ...prev,
        totalExpenses: prev.totalExpenses + expenseAmount,
        netBalance: prev.netBalance - expenseAmount
      }));

      // Reset form
      setExpenseAmount(0);
      setExpenseType("hospital_profit_withdrawal");

      toast({
        title: "Success",
        description: "Expense added successfully",
      });

    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setIsAddingExpense(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
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
            <Calculator className="w-7 h-7" />
            Pharmacy Account Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-10">
          {/* Starting Balance Input */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Wallet className="w-7 h-7 text-blue-600" />
                Starting Investment Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end gap-6">
                <div className="flex-1">
                  <Label htmlFor="starting-balance" className="text-lg font-medium">Investment Amount (PKR)</Label>
                  <Input
                    id="starting-balance"
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Number(e.target.value) || 0)}
                    placeholder="Enter starting investment"
                    className="mt-3 h-14 text-xl"
                  />
                </div>
                <Button 
                  onClick={handleSaveStartingBalance}
                  disabled={isSaving}
                  className="h-14 px-8 text-lg"
                  size="lg"
                >
                  {isSaving ? "Saving..." : "Update"}
                </Button>
              </div>
              <p className="text-base text-muted-foreground">
                This is the initial investment/capital put into the pharmacy business.
              </p>
            </CardContent>
          </Card>

          {/* Add Expense Section */}
          <Card className="border-2 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Minus className="w-7 h-7 text-orange-600" />
                Add Pharmacy Expense
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="expense-amount" className="text-lg font-medium">Expense Amount (PKR)</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value) || 0)}
                    placeholder="Enter expense amount"
                    className="mt-3 h-14 text-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="expense-type" className="text-lg font-medium">Expense Type</Label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger className="mt-3 h-14 text-lg">
                      <SelectValue placeholder="Select expense type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital_profit_withdrawal">Hospital Profit Withdrawal</SelectItem>
                      <SelectItem value="bill_payment">Bill Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-base text-muted-foreground">
                  Track hospital profit withdrawals and bill payments from pharmacy account.
                </p>
                <Button 
                  onClick={handleAddExpense}
                  disabled={isAddingExpense || expenseAmount <= 0}
                  className="bg-orange-600 hover:bg-orange-700 h-14 px-8 text-lg"
                  size="lg"
                >
                  <Receipt className="w-5 h-5 mr-2" />
                  {isAddingExpense ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {formatPkrAmount(pharmacyStats.totalRevenue)}
                </div>
                <p className="text-sm text-muted-foreground">
                  All pharmacy sales revenue
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {formatPkrAmount(pharmacyStats.totalProfit)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selling price - buying price
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Minus className="w-5 h-5 text-red-600" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {formatPkrAmount(pharmacyStats.totalExpenses)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Profit withdrawals & expenses
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow bg-blue-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {formatPkrAmount(pharmacyStats.netBalance)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Current available balance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-2xl">Detailed Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-semibold">Starting Investment:</span>
                    <span className="font-bold text-blue-600">{formatPkrAmount(startingBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-semibold">Revenue Generated:</span>
                    <span className="font-bold text-green-600">+ {formatPkrAmount(pharmacyStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-semibold">Total Expenses:</span>
                    <span className="font-bold text-red-600">- {formatPkrAmount(pharmacyStats.totalExpenses)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-semibold">Total Investment + Revenue:</span>
                    <span className="font-bold text-gray-700">{formatPkrAmount(pharmacyStats.totalInvestment)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-semibold">Net Profit Earned:</span>
                    <span className="font-bold text-purple-600">{formatPkrAmount(pharmacyStats.totalProfit)}</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow-sm">
                  <div className="flex justify-between items-center text-2xl">
                    <span className="font-bold">Net Available Balance:</span>
                    <span className="font-bold text-blue-700 ml-8">{formatPkrAmount(pharmacyStats.netBalance)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="lg" className="px-12 py-3 text-lg">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}