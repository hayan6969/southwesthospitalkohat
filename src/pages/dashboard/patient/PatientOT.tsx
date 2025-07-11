import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Clock, User, FileText, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";

interface OTSchedule {
  id: string;
  doctor_name: string;
  doctor_expense: number;
  operation_date: string;
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

export default function PatientOT() {
  const [otSchedules, setOtSchedules] = useState<OTSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchOTSchedules();
    }
  }, [profile?.id]);

  const fetchOTSchedules = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("ot_schedules")
        .select(`
          *,
          operation:ot_operations(operation_name),
          room:ot_rooms(room_name)
        `)
        .eq("patient_id", profile.id)
        .order("operation_date", { ascending: false });

      if (error) throw error;
      setOtSchedules(data || []);
    } catch (error) {
      console.error("Error fetching OT schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const upcomingOTs = otSchedules.filter(ot => ot.status === 'scheduled').length;
  const completedOTs = otSchedules.filter(ot => ot.status === 'completed').length;
  const totalCost = otSchedules.reduce((sum, ot) => sum + ot.total_cost, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My OT Operations</h2>
        <p className="text-muted-foreground">View your scheduled and completed surgical procedures</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Operations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingOTs}</div>
            <p className="text-xs text-muted-foreground">Scheduled procedures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Operations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOTs}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrAmount(totalCost)}</div>
            <p className="text-xs text-muted-foreground">All operations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            OT Operations History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {otSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No OT operations scheduled</h3>
              <p className="text-gray-500">You don't have any surgical procedures scheduled yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue #</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otSchedules.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium">#{ot.queue_position}</TableCell>
                      <TableCell className="font-medium">
                        {ot.operation?.operation_name || 'Unknown Operation'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {ot.doctor_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(ot.operation_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {ot.room?.room_name || 'Unknown Room'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ot.status)}>
                          {ot.status.charAt(0).toUpperCase() + ot.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          {formatPkrAmount(ot.total_cost)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ot.notes ? (
                          <div className="max-w-xs truncate" title={ot.notes}>
                            {ot.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400">No notes</span>
                        )}
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
  );
}