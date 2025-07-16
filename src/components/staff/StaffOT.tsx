
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, CreditCard, Clock, Users, Activity, Plus, Edit, Banknote, Search, Check, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";
import { OTScheduleDialog } from "@/components/dialogs/OTScheduleDialog";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { generateOTPDF } from "@/utils/pdfGenerator";

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
  id: string;
  patient_id: string;
  doctor_id: string | null;
  doctor_name: string;
  doctor_expense: number;
  operation_date: string;
  operation_id: string | null;
  queue_position: number;
  status: string;
  notes: string | null;
  total_cost: number;
  operation: {
    operation_name: string;
  } | null;
  room: {
    room_name: string;
  } | null;
}

export function StaffOT() {
  const [otSchedule, setOtSchedule] = useState<OTScheduleItem[]>([]);
  const [filteredOtSchedule, setFilteredOtSchedule] = useState<OTScheduleItem[]>([]);
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [availableRoomsCount, setAvailableRoomsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<OTScheduleItem | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();

  useEffect(() => {
    fetchOperations();
    fetchOTSchedules();
    fetchAvailableRoomsCount();
    
    // Set up real-time listener for OT schedules
    console.log('🔄 Setting up OT real-time updates...');
    const channel = supabase
      .channel('ot-schedules-realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: 'ot-staff' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'ot_schedules'
        },
        (payload) => {
          console.log('🔄 OT schedule change detected:', payload);
          // Add a small delay to ensure database consistency
          setTimeout(() => {
            console.log('🔄 Refetching OT schedules...');
            fetchOTSchedules();
          }, 200);
        }
      )
      .subscribe((status) => {
        console.log('📡 OT real-time channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ OT real-time updates successfully subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ OT real-time channel error');
        }
      });

    // Listen for custom events from the dialog
    const handleOTScheduleUpdate = () => {
      console.log('📅 Custom OT schedule update event received');
      fetchOTSchedules();
    };

    window.addEventListener('otScheduleUpdate', handleOTScheduleUpdate);

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up OT real-time channel...');
      supabase.removeChannel(channel);
      window.removeEventListener('otScheduleUpdate', handleOTScheduleUpdate);
    };
  }, []); // Remove dependencies to avoid re-subscription

  const fetchOTSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_schedules")
        .select(`
          *,
          operation:ot_operations(operation_name),
          room:ot_rooms(room_name)
        `)
        .order("operation_date", { ascending: true })
        .order("queue_position", { ascending: true });

      if (error) throw error;
      setOtSchedule(data || []);
      filterOTSchedules(data || [], searchTerm, selectedDate);
    } catch (error) {
      console.error("Error fetching OT schedules:", error);
    }
  };

  useEffect(() => {
    filterOTSchedules(otSchedule, searchTerm, selectedDate);
  }, [searchTerm, selectedDate, otSchedule]);

  const filterOTSchedules = (schedules: OTScheduleItem[], search: string, date: string) => {
    let filtered = schedules;

    // Filter by date
    if (date) {
      filtered = filtered.filter(ot => ot.operation_date === date);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(ot => {
        const patientName = getPatientName(ot.patient_id, patientNames || []).toLowerCase();
        return (
          patientName.includes(searchLower) ||
          ot.patient_id.toLowerCase().includes(searchLower) ||
          ot.doctor_name.toLowerCase().includes(searchLower) ||
          ot.operation?.operation_name?.toLowerCase().includes(searchLower) ||
          ot.room?.room_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredOtSchedule(filtered);
  };

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

  const fetchAvailableRoomsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("ot_rooms")
        .select("*", { count: 'exact', head: true })
        .eq("is_available", true);

      if (error) throw error;
      setAvailableRoomsCount(count || 0);
    } catch (error) {
      console.error("Error fetching available rooms count:", error);
    }
  };

  const handleCompleteOT = (scheduleItem: OTScheduleItem) => {
    setSelectedScheduleItem(scheduleItem);
    setCompleteDialog(true);
  };

  const completeOT = async () => {
    if (!selectedScheduleItem) return;

    try {
      const { error } = await supabase
        .from("ot_schedules")
        .update({ 
          status: 'completed',
          notes: completionNotes 
        })
        .eq("id", selectedScheduleItem.id);

      if (error) throw error;

      toast({
        title: "OT Completed",
        description: "Operation completed successfully",
      });

      setCompleteDialog(false);
      setCompletionNotes("");
      setSelectedScheduleItem(null);
      
      // Manually refresh the table to ensure immediate update
      fetchOTSchedules();
    } catch (error) {
      console.error("Error completing OT:", error);
      toast({
        title: "Error",
        description: "Failed to complete operation",
        variant: "destructive",
      });
    }
  };


  const handleDownloadInvoice = async (scheduleItem: OTScheduleItem) => {
    setDownloadingInvoice(scheduleItem.id);
    try {
      const patientName = getPatientName(scheduleItem.patient_id, patientNames || []);
      
      // Fetch patient data to get patient number and contact
      const { data: patientData } = await supabase
        .from('patients')
        .select(`
          patient_number,
          profiles!patients_id_fkey(email, phone)
        `)
        .eq('id', scheduleItem.patient_id)
        .single();

      // Fetch detailed OT expenses for this operation
      const { data: expensesData } = await supabase
        .from('ot_expenses')
        .select('expense_name, cost')
        .eq('operation_id', scheduleItem.operation_id || '');

      const phoneNumber = patientData?.profiles?.phone || 
        (patientData?.profiles?.email ? patientData.profiles.email.split('@')[0].replace(/[^0-9]/g, '') : 'N/A');

      // Build items array with detailed breakdown
      const items = [];
      
      // Doctor Charges Section
      const doctorCharges = scheduleItem.doctor_expense || 0;
      if (doctorCharges > 0) {
        items.push({
          description: `--- DOCTOR CHARGES ---`,
          quantity: '',
          unitPrice: '',
          totalPrice: '',
          isHeader: true
        });
        items.push({
          description: `Doctor Fee (${scheduleItem.doctor_name || 'Unknown'})`,
          quantity: 1,
          unitPrice: doctorCharges,
          totalPrice: doctorCharges
        });
      }
      
      // Hospital Charges Section
      items.push({
        description: `--- HOSPITAL CHARGES ---`,
        quantity: '',
        unitPrice: '',
        totalPrice: '',
        isHeader: true
      });

      // Add OT expenses if available
      if (expensesData && expensesData.length > 0) {
        expensesData.forEach(expense => {
          items.push({
            description: expense.expense_name,
            quantity: 1,
            unitPrice: expense.cost,
            totalPrice: expense.cost
          });
        });
      } else {
        // Fallback to room charges
        const roomCharges = (scheduleItem.total_cost || 0) - (scheduleItem.doctor_expense || 0);
        if (roomCharges > 0) {
          items.push({
            description: `OT Room Charges (${scheduleItem.room?.room_name || 'Unknown'})`,
            quantity: 1,
            unitPrice: roomCharges,
            totalPrice: roomCharges
          });
        }
      }
      
      const invoiceData = {
        invoiceNumber: `OT-${scheduleItem.id.slice(0, 8)}`,
        patientName: patientName,
        patientId: patientData?.patient_number || 'N/A',
        patientPhone: phoneNumber,
        doctorName: scheduleItem.doctor_name || 'Unknown',
        procedure: scheduleItem.operation?.operation_name || 'Unknown',
        room: scheduleItem.room?.room_name || 'Unknown',
        date: new Date(scheduleItem.operation_date).toLocaleDateString(),
        totalAmount: scheduleItem.total_cost || 0,
        items: items
      };

      await generateOTPDF(invoiceData);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(null);
    }
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
              {otSchedule.filter(ot => ot.status === 'in_progress').length}
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
            <div className="text-2xl font-bold">{availableRoomsCount}</div>
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

      <div className="flex flex-wrap gap-3 items-center">
        <OTScheduleDialog />
        
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search OTs (patient name, ID, doctor...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter" className="text-sm font-medium">Date:</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
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
                    <TableHead>Queue #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOtSchedule.map((ot) => {
                    const patientName = getPatientName(ot.patient_id, patientNames || []);
                    
                    return (
                      <TableRow key={ot.id}>
                        <TableCell className="font-medium">#{ot.queue_position}</TableCell>
                        <TableCell className="font-medium">{patientName}</TableCell>
                        <TableCell>{ot.doctor_name}</TableCell>
                        <TableCell>{ot.operation?.operation_name || 'Unknown'}</TableCell>
                        <TableCell>{new Date(ot.operation_date).toLocaleDateString()}</TableCell>
                        <TableCell>{ot.room?.room_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            ot.status === 'in_progress' ? 'default' :
                            ot.status === 'scheduled' ? 'secondary' :
                            ot.status === 'completed' ? 'outline' :
                            'destructive'
                          }>
                            {ot.status.charAt(0).toUpperCase() + ot.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            {formatPkrAmount(ot.total_cost)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {ot.status !== 'completed' && ot.status !== 'cancelled' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCompleteOT(ot)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadInvoice(ot)}
                              disabled={downloadingInvoice === ot.id}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {downloadingInvoice === ot.id ? (
                                <>
                                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3 mr-1" />
                                  Invoice
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Complete OT Dialog */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete OT Operation</DialogTitle>
          </DialogHeader>
          {selectedScheduleItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Operation Details</h4>
                <p><strong>Patient:</strong> {getPatientName(selectedScheduleItem.patient_id, patientNames || [])}</p>
                <p><strong>Doctor:</strong> {selectedScheduleItem.doctor_name}</p>
                <p><strong>Procedure:</strong> {selectedScheduleItem.operation?.operation_name || 'Unknown'}</p>
                <p><strong>Room:</strong> {selectedScheduleItem.room?.room_name || 'Unknown'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
                <Textarea
                  id="completion-notes"
                  placeholder="Add any notes about the operation completion..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCompleteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={completeOT} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Complete Operation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
