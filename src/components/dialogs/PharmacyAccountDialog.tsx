import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Calculator, TrendingUp, DollarSign, Wallet } from "lucide-react";

interface PharmacyAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PharmacyAccountDialog({ open, onOpenChange }: PharmacyAccountDialogProps) {
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pharmacyStats, setPharmacyStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalInvestment: 0
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

      setPharmacyStats({
        totalRevenue,
        totalProfit,
        totalInvestment: (accountData?.starting_balance || 0) + totalRevenue
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
        totalInvestment: startingBalance + prev.totalRevenue
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pharmacy Account Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Starting Balance Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Starting Investment Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="starting-balance">Investment Amount (PKR)</Label>
                  <Input
                    id="starting-balance"
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Number(e.target.value) || 0)}
                    placeholder="Enter starting investment"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSaveStartingBalance}
                  disabled={isSaving}
                  className="mb-0"
                >
                  {isSaving ? "Saving..." : "Update"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This is the initial investment/capital put into the pharmacy business.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPkrAmount(pharmacyStats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All pharmacy sales revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatPkrAmount(pharmacyStats.totalProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selling price - buying price
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  Total Money
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPkrAmount(pharmacyStats.totalInvestment)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Starting balance + revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Starting Investment:</span>
                <span className="font-bold text-blue-600">{formatPkrAmount(startingBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Revenue Generated:</span>
                <span className="font-bold text-green-600">+ {formatPkrAmount(pharmacyStats.totalRevenue)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total Account Value:</span>
                <span className="font-bold text-blue-700">{formatPkrAmount(pharmacyStats.totalInvestment)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Profit Earned:</span>
                <span className="font-bold text-purple-600">{formatPkrAmount(pharmacyStats.totalProfit)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}