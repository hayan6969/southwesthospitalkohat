import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";

interface Expense {
  expense_name: string;
  cost: string;
}

interface OTOperationDialogProps {
  onOperationAdded?: () => void;
  editingOperation?: {
    id: string;
    operation_name: string;
    expenses: { id: string; expense_name: string; cost: number; }[];
  } | null;
  onEditComplete?: () => void;
}

export function OTOperationDialog({ onOperationAdded, editingOperation, onEditComplete }: OTOperationDialogProps) {
  const [open, setOpen] = useState(false);
  const [operationName, setOperationName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([{ expense_name: "", cost: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle editing mode
  useEffect(() => {
    if (editingOperation) {
      setOperationName(editingOperation.operation_name);
      setExpenses(editingOperation.expenses.length > 0 
        ? editingOperation.expenses.map(exp => ({
            expense_name: exp.expense_name,
            cost: exp.cost.toString()
          }))
        : [{ expense_name: "", cost: "" }]
      );
      setOpen(true);
    }
  }, [editingOperation]);

  const addExpense = () => {
    setExpenses([...expenses, { expense_name: "", cost: "" }]);
  };

  const removeExpense = (index: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const updateExpense = (index: number, field: keyof Expense, value: string) => {
    const updated = expenses.map((expense, i) => 
      i === index ? { ...expense, [field]: value } : expense
    );
    setExpenses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!operationName.trim()) {
      toast({
        title: "Error",
        description: "Operation name is required",
        variant: "destructive",
      });
      return;
    }

    const validExpenses = expenses.filter(exp => 
      exp.expense_name.trim() && exp.cost.trim() && !isNaN(Number(exp.cost))
    );

    if (validExpenses.length === 0) {
      toast({
        title: "Error", 
        description: "At least one valid expense is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingOperation) {
        // Update existing operation
        const { error: operationError } = await supabase
          .from("ot_operations")
          .update({ operation_name: operationName.trim() })
          .eq("id", editingOperation.id);

        if (operationError) throw operationError;

        // Delete existing expenses
        const { error: deleteError } = await supabase
          .from("ot_expenses")
          .delete()
          .eq("operation_id", editingOperation.id);

        if (deleteError) throw deleteError;

        // Insert new expenses
        if (validExpenses.length > 0) {
          const expenseRecords = validExpenses.map(exp => ({
            operation_id: editingOperation.id,
            expense_name: exp.expense_name.trim(),
            cost: Number(exp.cost),
          }));

          const { error: expenseError } = await supabase
            .from("ot_expenses")
            .insert(expenseRecords);

          if (expenseError) throw expenseError;
        }

        toast({
          title: "Success",
          description: `OT operation "${operationName}" updated successfully`,
        });

        onEditComplete?.();
      } else {
        // Create new operation
        const { data: operation, error: operationError } = await supabase
          .from("ot_operations")
          .insert([{ operation_name: operationName.trim() }])
          .select()
          .single();

        if (operationError) throw operationError;

        // Create the expenses
        const expenseRecords = validExpenses.map(exp => ({
          operation_id: operation.id,
          expense_name: exp.expense_name.trim(),
          cost: Number(exp.cost),
        }));

        const { error: expenseError } = await supabase
          .from("ot_expenses")
          .insert(expenseRecords);

        if (expenseError) throw expenseError;

        toast({
          title: "Success",
          description: `OT operation "${operationName}" added successfully`,
        });

        onOperationAdded?.();
      }

      // Reset form
      setOperationName("");
      setExpenses([{ expense_name: "", cost: "" }]);
      setOpen(false);

    } catch (error) {
      console.error("Error with OT operation:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingOperation ? 'update' : 'create'} OT operation`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = expenses
    .filter(exp => exp.cost.trim() && !isNaN(Number(exp.cost)))
    .reduce((sum, exp) => sum + Number(exp.cost), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editingOperation && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add OT Operation
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOperation ? 'Edit OT Operation' : 'Add New OT Operation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="operation-name">Operation Name</Label>
            <Input
              id="operation-name"
              value={operationName}
              onChange={(e) => setOperationName(e.target.value)}
              placeholder="e.g., Appendectomy, Gallbladder Surgery"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Expenses</Label>
              <Button type="button" variant="outline" size="sm" onClick={addExpense}>
                <Plus className="w-4 h-4 mr-1" />
                Add Expense
              </Button>
            </div>

            {expenses.map((expense, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`expense-name-${index}`}>Expense Name</Label>
                  <Input
                    id={`expense-name-${index}`}
                    value={expense.expense_name}
                    onChange={(e) => updateExpense(index, "expense_name", e.target.value)}
                    placeholder="e.g., Room charges, Equipment"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label htmlFor={`cost-${index}`}>Cost (PKR)</Label>
                  <Input
                    id={`cost-${index}`}
                    type="number"
                    value={expense.cost}
                    onChange={(e) => updateExpense(index, "cost", e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                {expenses.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeExpense(index)}
                    className="mb-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {totalCost > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Total Cost:</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatPkrAmount(totalCost)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingOperation ? "Updating..." : "Creating...") 
                : (editingOperation ? "Update Operation" : "Create Operation")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}