import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, User, Building2, Banknote, Clock, FileText, Edit, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { OTNotesDialog } from "@/components/dialogs/OTNotesDialog";
import { useToast } from "@/hooks/use-toast";

interface OTScheduleWithDetails {
  id: string;
  operation_date: string;
  doctor_expense: number;
  total_cost: number;
  status: string;
  notes: string;
  queue_position: number;
  doctor_name: string;
  doctor_id: string;
  patient_id: string;
  patient: {
    patient_number: string;
    profile: {
      first_name: string;
      last_name: string;
      phone: string;
    };
  };
  operation: {
    operation_name: string;
  };
  room: {
    room_name: string;
  };
  ot_notes?: any;
}

export default function DoctorOT() {
  const { profile } = useAuth();
  const { toast: useToastHook } = useToast();
  const [otSchedules, setOtSchedules] = useState<OTScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  
  // Dialog states
  const [showOTNotesDialog, setShowOTNotesDialog] = useState(false);
  const [selectedOT, setSelectedOT] = useState<OTScheduleWithDetails | null>(null);

  useEffect(() => {
    fetchDoctorOTSchedules();
  }, [profile?.id]);

  const fetchDoctorOTSchedules = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('ot_schedules')
        .select(`
          id,
          operation_date,
          doctor_expense,
          total_cost,
          status,
          notes,
          queue_position,
          doctor_name,
          doctor_id,
          patient_id,
          ot_notes,
          patient:patients (
            patient_number,
            profiles (
              first_name,
              last_name,
              phone
            )
          ),
          operation:ot_operations (
            operation_name
          ),
          room:ot_rooms (
            room_name
          )
        `)
        .eq('doctor_id', profile.id)
        .order('operation_date', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(schedule => ({
        ...schedule,
        patient: {
          patient_number: schedule.patient?.patient_number || '',
          profile: {
            first_name: schedule.patient?.profiles?.first_name || '',
            last_name: schedule.patient?.profiles?.last_name || '',
            phone: schedule.patient?.profiles?.phone || ''
          }
        },
        operation: {
          operation_name: schedule.operation?.operation_name || ''
        },
        room: {
          room_name: schedule.room?.room_name || ''
        }
      })) || [];

      setOtSchedules(formattedData);

      // Calculate total earnings from completed OTs
      const completedOTs = formattedData.filter(ot => ot.status === 'completed');
      const totalEarned = completedOTs.reduce((sum, ot) => sum + ot.doctor_expense, 0);
      setTotalEarnings(totalEarned);

    } catch (error) {
      console.error('Error fetching OT schedules:', error);
      toast.error('Failed to load OT schedules');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOTNotes = (ot: OTScheduleWithDetails) => {
    setSelectedOT(ot);
    setShowOTNotesDialog(true);
  };

  const handleDischarge = async (ot: OTScheduleWithDetails) => {
    try {
      const { error } = await supabase
        .from("ot_schedules")
        .update({ status: 'completed' })
        .eq("id", ot.id);

      if (error) throw error;

      useToastHook({
        title: "Patient Discharged",
        description: "OT operation completed successfully",
      });

      fetchDoctorOTSchedules();
    } catch (error) {
      console.error("Error discharging patient:", error);
      useToastHook({
        title: "Error",
        description: "Failed to discharge patient",
        variant: "destructive",
      });
    }
  };

  const upcomingOTs = otSchedules.filter(ot => 
    new Date(ot.operation_date) >= new Date() && ot.status === 'scheduled'
  );

  const completedOTs = otSchedules.filter(ot => ot.status === 'completed');
  const recentCompletedOTs = completedOTs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OT Operations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otSchedules.length}</div>
            <p className="text-xs text-muted-foreground">
              All time operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Operations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingOTs.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              From completed OTs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OT Operations Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            OT Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pending Operations</TabsTrigger>
              <TabsTrigger value="completed">Completed Operations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-4">
              {upcomingOTs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingOTs.map((ot) => (
                        <TableRow key={ot.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(ot.operation_date), 'MMM d, yyyy')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(ot.operation_date), 'EEEE')}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {ot.patient.profile.first_name} {ot.patient.profile.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {ot.patient.patient_number}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{ot.operation.operation_name}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span>{ot.room.room_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{ot.queue_position}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatPkrAmount(ot.doctor_expense)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ot.status)}>
                              {ot.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleOTNotes(ot)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                OT Notes
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleDischarge(ot)}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="w-3 h-3" />
                                Discharge
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No pending operations found
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          ) : recentCompletedOTs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Your Fee</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCompletedOTs.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(ot.operation_date), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(ot.operation_date), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {ot.patient.profile.first_name} {ot.patient.profile.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ot.patient.patient_number}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{ot.operation.operation_name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{ot.room.room_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatPkrAmount(ot.total_cost)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          {formatPkrAmount(ot.doctor_expense)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {ot.notes || 'No notes'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No completed OT operations found
            </div>
          )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* OT Notes Dialog */}
      <OTNotesDialog 
        open={showOTNotesDialog}
        onOpenChange={setShowOTNotesDialog}
        otSchedule={selectedOT}
        onSave={fetchDoctorOTSchedules}
      />
    </div>
  );
}