import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, Trash2, DollarSign, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";
import { OTOperationDialog } from "@/components/dialogs/OTOperationDialog";

interface OTOperation {
  id: string;
  operation_name: string;
  created_at: string;
  expenses: {
    id: string;
    expense_name: string;
    cost: number;
  }[];
}

export function AdminOT() {
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchOperations = async () => {
    setIsLoading(true);
    try {
      const { data: operationsData, error: operationsError } = await supabase
        .from("ot_operations")
        .select(`
          id,
          operation_name,
          created_at,
          ot_expenses (
            id,
            expense_name,
            cost
          )
        `)
        .order("created_at", { ascending: false });

      if (operationsError) throw operationsError;

      const formattedOperations = operationsData?.map(op => ({
        ...op,
        expenses: op.ot_expenses || []
      })) || [];

      setOperations(formattedOperations);
    } catch (error) {
      console.error("Error fetching OT operations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch OT operations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOperation = async (operationId: string, operationName: string) => {
    if (!confirm(`Are you sure you want to delete "${operationName}"? This will also delete all associated expenses.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ot_operations")
        .delete()
        .eq("id", operationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operation "${operationName}" deleted successfully`,
      });

      fetchOperations();
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast({
        title: "Error",
        description: "Failed to delete operation",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const totalOperations = operations.length;
  const totalUniqueExpenseTypes = [...new Set(
    operations.flatMap(op => op.expenses.map(exp => exp.expense_name))
  )].length;
  const averageCostPerOperation = operations.length > 0 
    ? operations.reduce((sum, op) => 
        sum + op.expenses.reduce((expSum, exp) => expSum + exp.cost, 0), 0
      ) / operations.length 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">OT Operations & Rates</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">OT Operations & Rates</h3>
        <OTOperationDialog onOperationAdded={fetchOperations} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOperations}</div>
            <p className="text-xs text-muted-foreground">Configured procedures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expense Types</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUniqueExpenseTypes}</div>
            <p className="text-xs text-muted-foreground">Unique expense categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(averageCostPerOperation)}</div>
            <p className="text-xs text-muted-foreground">Per operation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              OT Operations & Expenses
            </CardTitle>
          </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No OT operations configured</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first OT operation and its associated expenses.</p>
              <OTOperationDialog onOperationAdded={fetchOperations} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation Name</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((operation) => {
                    const totalCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                    
                    return (
                      <TableRow key={operation.id}>
                        <TableCell className="font-medium">{operation.operation_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {operation.expenses.map((expense) => (
                              <div key={expense.id} className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {expense.expense_name}
                                </Badge>
                                <span className="text-sm font-medium ml-2">
                                  {formatPkrAmount(expense.cost)}
                                </span>
                              </div>
                            ))}
                            {operation.expenses.length === 0 && (
                              <span className="text-sm text-gray-500">No expenses</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            {formatPkrAmount(totalCost)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(operation.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => deleteOperation(operation.id, operation.operation_name)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              OT Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <div className="text-center py-8">
                <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No OT rooms configured</p>
                <p className="text-sm text-gray-400">Add rooms to start managing OT schedules</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_name}</TableCell>
                        <TableCell>
                          <Badge variant={room.is_available ? "default" : "destructive"}>
                            {room.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleRoomAvailability(room.id, room.is_available)}
                          >
                            {room.is_available ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}