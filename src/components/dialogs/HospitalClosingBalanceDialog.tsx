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
import { Wallet, Calculator, Save, Lock } from "lucide-react";
import { format, subDays } from "date-fns";

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
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const { toast } = useToast();

  const targetDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, targetDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch previous day's closing balance (locked/read-only)
      const { data: prevBalance } = await supabase
        .from('hospital_closing_balance')
        .select('closing_balance')
        .lt('closing_date', targetDate)
        .order('closing_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPreviousBalance(prevBalance?.closing_balance || 0);

      // Check if current date already has a record
      const { data: currentRecord, error } = await supabase
        .from('hospital_closing_balance')
        .select('*')
        .eq('closing_date', targetDate)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (currentRecord) {
        setClosingBalance(String(currentRecord.closing_balance || 0));
        setNotes(currentRecord.notes || "");
        setHasExistingRecord(true);
      } else {
        setClosingBalance("0");
        setNotes("");
        setHasExistingRecord(false);
      }
    } catch (error) {
      console.error('Error fetching closing balance:', error);
      setClosingBalance("0");
      setNotes("");
      setPreviousBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClosingBalance = async () => {
    setIsSaving(true);
    const numericBalance = parseFloat(closingBalance) || 0;

    try {
      const { data: existingRecord, error: fetchError } = await supabase
        .from('hospital_closing_balance')
        .select('id')
        .eq('closing_date', targetDate)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingRecord) {
        const { error } = await supabase
          .from('hospital_closing_balance')
          .update({
            closing_balance: numericBalance,
            notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hospital_closing_balance')
          .insert([{
            closing_date: targetDate,
            closing_balance: numericBalance,
            notes: notes
          }]);

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Calculator className="w-7 h-7" />
            Hospital Closing Balance - {format(selectedDate, 'MMM dd, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Previous Balance - Locked/Read-only */}
          <Card className="border-2 border-gray-300 bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-500" />
                Previous Closing Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Old Balance:</span>
                  <span className="font-bold text-xl text-muted-foreground">
                    {formatPkrAmount(previousBalance)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This is the last saved closing balance before {format(selectedDate, 'MMM dd, yyyy')}. It cannot be edited from here.
              </p>
            </CardContent>
          </Card>

          {/* New Closing Balance - Editable */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <Wallet className="w-5 h-5 text-blue-600" />
                Today's Closing Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="closing-balance" className="text-base font-medium">
                  New Closing Balance (PKR)
                </Label>
                <Input
                  id="closing-balance"
                  type="number"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="Enter closing balance"
                  className="mt-2 h-12 text-lg"
                />
              </div>
              
              <div>
                <Label htmlFor="notes" className="text-base font-medium">
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
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">New Closing Balance:</span>
                  <span className="font-bold text-blue-600">
                    {formatPkrAmount(parseFloat(closingBalance) || 0)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This amount will be used as the starting balance for the next day's financial calculations.
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
