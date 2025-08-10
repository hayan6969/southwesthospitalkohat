import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface EmergencyExpense {
  id: string;
  name: string;
  cost: number;
  created_at: string;
}

export function EmergencyExpensesManager() {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch emergency expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['emergency-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmergencyExpense[];
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !cost || parseFloat(cost) <= 0) {
      toast.error("Please enter a valid name and cost");
      return;
    }

    setIsLoading(true);

    try {
      if (editingId) {
        // Update existing expense
        const { error } = await supabase
          .from('emergency_expenses')
          .update({
            name: name.trim(),
            cost: parseFloat(cost),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Emergency expense updated successfully");
        setEditingId(null);
      } else {
        // Create new expense
        const { error } = await supabase
          .from('emergency_expenses')
          .insert({
            name: name.trim(),
            cost: parseFloat(cost),
            created_by: profile?.id
          });

        if (error) throw error;
        toast.success("Emergency expense added successfully");
      }

      // Reset form
      setName("");
      setCost("");
      
      // Refresh the list
      queryClient.invalidateQueries({ queryKey: ['emergency-expenses'] });
    } catch (error) {
      console.error('Error managing emergency expense:', error);
      toast.error("Failed to save emergency expense");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (expense: EmergencyExpense) => {
    setName(expense.name);
    setCost(expense.cost.toString());
    setEditingId(expense.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this emergency expense?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emergency_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Emergency expense deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['emergency-expenses'] });
    } catch (error) {
      console.error('Error deleting emergency expense:', error);
      toast.error("Failed to delete emergency expense");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setCost("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Emergency Expenses Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseName">Expense Name</Label>
                <Input
                  id="expenseName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., X-ray, Lab Test, Injection"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseCost">Cost (PKR)</Label>
                <Input
                  id="expenseCost"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className={editingId ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {editingId ? (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Update Expense
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Expenses List ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No emergency expenses configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{expense.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Cost: {formatPkrAmount(expense.cost)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}