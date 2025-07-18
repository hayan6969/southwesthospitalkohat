import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Edit, Trash2, Banknote, Activity, Home, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

interface OTRoom {
  id: string;
  room_name: string;
  is_available: boolean;
  created_at: string;
}

export function AdminOT() {
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [rooms, setRooms] = useState<OTRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editingOperation, setEditingOperation] = useState<OTOperation | null>(null);
  const { toast } = useToast();

  const fetchOperations = async () => {
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
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_rooms")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast({
        title: "Error",
        description: "Failed to fetch OT rooms",
        variant: "destructive",
      });
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("ot_rooms")
        .insert({
          room_name: newRoomName.trim(),
          is_available: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "OT room added successfully",
      });

      setNewRoomName("");
      setRoomDialogOpen(false);
      fetchRooms();
    } catch (error) {
      console.error("Error adding room:", error);
      toast({
        title: "Error",
        description: "Failed to add OT room",
        variant: "destructive",
      });
    }
  };

  const toggleRoomAvailability = async (roomId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("ot_rooms")
        .update({ is_available: !currentStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Room ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchRooms();
    } catch (error) {
      console.error("Error updating room:", error);
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
    }
  };

  const deleteOperation = async (operationId: string) => {
    try {
      // First check if this operation is referenced in any schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from("ot_schedules")
        .select("id")
        .eq("operation_id", operationId)
        .limit(1);

      if (scheduleError) throw scheduleError;

      if (schedules && schedules.length > 0) {
        toast({
          title: "Cannot Delete Operation",
          description: "This operation is currently assigned to OT schedules and cannot be deleted.",
          variant: "destructive",
        });
        return;
      }

      // If no schedules reference this operation, proceed with deletion
      const { error } = await supabase
        .from("ot_operations")
        .delete()
        .eq("id", operationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Operation deleted successfully",
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
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchOperations(), fetchRooms()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const totalOperations = operations.length;
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(room => room.is_available).length;
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
          <h3 className="text-2xl font-bold">OT Management</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
        <div>
          <h3 className="text-2xl font-bold">OT Management</h3>
          <p className="text-muted-foreground">Manage operating theater operations, expenses, and rooms</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Add OT Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New OT Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., OT-1, Surgery Room A"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddRoom}>
                    Add Room
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <OTOperationDialog 
            onOperationAdded={fetchOperations} 
            editingOperation={null}
            onEditComplete={() => {
              setEditingOperation(null);
              fetchOperations();
            }}
          />
          {editingOperation && (
            <OTOperationDialog 
              onOperationAdded={fetchOperations} 
              editingOperation={editingOperation}
              onEditComplete={() => {
                setEditingOperation(null);
                fetchOperations();
              }}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">OT Rooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRooms}/{totalRooms}</div>
            <p className="text-xs text-muted-foreground">Available rooms</p>
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
            <Banknote className="h-4 w-4 text-muted-foreground" />
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
                <p className="text-sm text-muted-foreground">Use the "Add OT Operation" button in the top-right corner to create your first operation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation Name</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Total Cost</TableHead>
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
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingOperation(operation)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Operation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{operation.operation_name}"? 
                                      This will also delete all associated expenses. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOperation(operation.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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