
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, CreditCard, Clock, Users, Activity, Plus, Edit, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";
import { OTScheduleDialog } from "@/components/dialogs/OTScheduleDialog";

interface OTOperation {
  id: string;
  operation_name: string;
  expenses: {
    id: string;
    expense_name: string;
    cost: number;
  }[];
}

interface OTScheduleItem {
  id: number;
  patient: string;
  doctor: string;
  procedure: string;
  time: string;
  room: string;
  status: string;
}

export function StaffOT() {
  const [otSchedule] = useState<OTScheduleItem[]>([
    {
      id: 1,
      patient: "John Doe",
      doctor: "Dr. Smith",
      procedure: "Appendectomy",
      time: "10:00 AM",
      room: "OT-1",
      status: "Scheduled"
    },
    {
      id: 2,
      patient: "Jane Smith",
      doctor: "Dr. Johnson",
      procedure: "Gallbladder Surgery",
      time: "2:00 PM",
      room: "OT-2",
      status: "In Progress"
    }
  ]);

  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<OTScheduleItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_operations")
        .select(`
          id,
          operation_name,
          ot_expenses (
            id,
            expense_name,
            cost
          )
        `);

      if (error) throw error;
      
      const formattedOperations = data?.map(op => ({
        ...op,
        expenses: op.ot_expenses || []
      })) || [];

      setOperations(formattedOperations);
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  };

  const handleGenerateOTInvoice = (scheduleItem: OTScheduleItem) => {
    setSelectedScheduleItem(scheduleItem);
    setInvoiceDialog(true);
  };

  const generateInvoice = () => {
    if (!selectedScheduleItem || !selectedOperation) {
      toast({
        title: "Error",
        description: "Please select an operation type",
        variant: "destructive",
      });
      return;
    }

    const operation = operations.find(op => op.id === selectedOperation);
    if (!operation) return;

    const totalCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
    
    toast({
      title: "Invoice Generated",
      description: `OT Invoice for ${selectedScheduleItem.patient} - ${operation.operation_name} (${formatPkrAmount(totalCost)})`,
    });

    setInvoiceDialog(false);
    setSelectedOperation("");
    setSelectedScheduleItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled OTs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otSchedule.length}</div>
            <p className="text-xs text-muted-foreground">Today's operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {otSchedule.filter(ot => ot.status === 'In Progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Active operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
            <p className="text-xs text-muted-foreground">Per operation</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <OTScheduleDialog />
        <Button variant="outline">
          <CreditCard className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
        <Button variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          OT Analytics
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              OT Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otSchedule.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium">{ot.patient}</TableCell>
                      <TableCell>{ot.doctor}</TableCell>
                      <TableCell>{ot.procedure}</TableCell>
                      <TableCell>{ot.time}</TableCell>
                      <TableCell>{ot.room}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ot.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          ot.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {ot.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleGenerateOTInvoice(ot)}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Invoice
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available OT Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No OT operations configured</p>
              <p className="text-sm text-gray-400">Contact admin to add operation types</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operations.map((operation) => {
                const totalCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                return (
                  <div key={operation.id} className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-2">{operation.operation_name}</h4>
                    <div className="space-y-1 text-sm mb-3">
                      {operation.expenses.map((expense) => (
                        <div key={expense.id} className="flex justify-between">
                          <span>{expense.expense_name}:</span>
                          <span className="font-medium">{formatPkrAmount(expense.cost)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-green-600">{formatPkrAmount(totalCost)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Generation Dialog */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate OT Invoice</DialogTitle>
          </DialogHeader>
          {selectedScheduleItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Patient Details</h4>
                <p><strong>Patient:</strong> {selectedScheduleItem.patient}</p>
                <p><strong>Doctor:</strong> {selectedScheduleItem.doctor}</p>
                <p><strong>Procedure:</strong> {selectedScheduleItem.procedure}</p>
                <p><strong>Room:</strong> {selectedScheduleItem.room}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation-select">Select Operation Type</Label>
                <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose operation type for billing" />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((operation) => {
                      const totalCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                      return (
                        <SelectItem key={operation.id} value={operation.id}>
                          {operation.operation_name} - {formatPkrAmount(totalCost)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedOperation && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Invoice Breakdown
                  </h4>
                  {(() => {
                    const operation = operations.find(op => op.id === selectedOperation);
                    if (!operation) return null;
                    const totalCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                    return (
                      <div className="space-y-2">
                        {operation.expenses.map((expense) => (
                          <div key={expense.id} className="flex justify-between text-sm">
                            <span>{expense.expense_name}:</span>
                            <span className="font-medium">{formatPkrAmount(expense.cost)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span>Total Amount:</span>
                          <span className="text-green-600">{formatPkrAmount(totalCost)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setInvoiceDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={generateInvoice} disabled={!selectedOperation}>
                  Generate Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
