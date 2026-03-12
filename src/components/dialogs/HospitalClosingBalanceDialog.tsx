import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Wallet, Calculator, Save } from "lucide-react";
import { format } from "date-fns";

interface HospitalClosingBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

export function HospitalClosingBalanceDialog({ 
  open, 
  onOpenChange, 
  selectedDate 
}: HospitalClosingBalanceDialogProps) {
  const [closingBalance, setClosingBalance] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const targetDate = format(selectedDate, 'yyyy-MM-dd');

  // Fetch existing closing balance for the selected date
  useEffect(() => {
    if (open) {
      fetchClosingBalance();
    }
  }, [open, targetDate]);

  const fetchClosingBalance = async () => {
    setIsLoading(true);
    try {
      // Get the latest closing balance (single value that gets updated)
      const { data: latestBalance } = await supabase
        .from('hospital_closing_balance')
        .select('*')
        .order('closing_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestBalance) {
        setClosingBalance(latestBalance.closing_balance || 0);
        setNotes(latestBalance.notes || "");
      } else {
        setClosingBalance(0);
        setNotes("");
      }
    } catch (error) {
      console.error('Error fetching closing balance:', error);
      setClosingBalance(0);
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClosingBalance = async () => {
    setIsSaving(true);
    try {
      // Get the latest record to update (single balance system)
      const { data: latestRecord } = await supabase
        .from('hospital_closing_balance')
        .select('id')
        .order('closing_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRecord) {
        // Update the existing record
        const { error } = await supabase
          .from('hospital_closing_balance')
          .update({ 
            closing_date: targetDate,
            closing_balance: closingBalance,
            notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', latestRecord.id);

        if (error) throw error;
      } else {
        // Create the first record
        const { error } = await supabase
          .from('hospital_closing_balance')
          .insert({ 
            closing_date: targetDate,
            closing_balance: closingBalance,
            notes: notes
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Closing balance updated successfully",
      });

      onOpenChange(false);

    } catch (error) {
      console.error('Error saving closing balance:', error);
      toast({
        title: "Error",
        description: "Failed to update closing balance",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Calculator className="w-7 h-7" />
            Hospital Closing Balance - {format(selectedDate, 'MMM dd, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Closing Balance Input */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Wallet className="w-6 h-6 text-blue-600" />
                Yesterday's Closing Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="closing-balance" className="text-lg font-medium">
                  Closing Balance Amount (PKR)
                </Label>
                <Input
                  id="closing-balance"
                  type="number"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(Number(e.target.value) || 0)}
                  placeholder="Enter yesterday's closing balance"
                  className="mt-2 h-12 text-lg"
                />
              </div>
              
              <div>
                <Label htmlFor="notes" className="text-lg font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this closing balance..."
                  className="mt-2 h-20 text-base"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-xl">
                  <span className="font-semibold">Current Closing Balance:</span>
                  <span className="font-bold text-blue-600">
                    {formatPkrAmount(closingBalance)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This amount will be used as the starting balance for today's financial calculations.
                  Today's profit/loss will be added/subtracted to calculate the new closing balance.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="lg">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveClosingBalance}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Closing Balance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}