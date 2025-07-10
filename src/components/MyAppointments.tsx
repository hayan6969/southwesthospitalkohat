import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface AppointmentWithQueue {
  id: string;
  appointment_date: string;
  type: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  doctor: {
    first_name: string;
    last_name: string;
    specialization: string;
    consultation_fee: number;
  };
  queue_position: {
    queue_position: number;
    queue_status: string;
    ahead_count: number;
    estimated_wait: string;
  };
}

export const MyAppointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAppointments();
  }, [profile?.id]);

  const fetchMyAppointments = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch appointments with doctor details separately
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          type,
          notes,
          status,
          doctor_id
        `)
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Get doctors data separately
      const doctorIds = appointmentsData.map(a => a.doctor_id);
      const [doctorsData, profilesData] = await Promise.all([
        supabase.from('doctors').select('id, specialization, consultation_fee').in('id', doctorIds),
        supabase.from('profiles').select('id, first_name, last_name').in('id', doctorIds)
      ]);

      if (doctorsData.error) throw doctorsData.error;
      if (profilesData.error) throw profilesData.error;

      // For each appointment, get queue position and calculate ahead count
      const appointmentsWithQueue = await Promise.all(
        appointmentsData.map(async (appointment) => {
          const appointmentDate = new Date(appointment.appointment_date).toISOString().split('T')[0];
          
          // Get doctor and profile info
          const doctor = doctorsData.data?.find(d => d.id === appointment.doctor_id);
          const profile = profilesData.data?.find(p => p.id === appointment.doctor_id);
          
          // Get this appointment's queue position
          const { data: queueData, error: queueError } = await supabase
            .from('queue_positions')
            .select('queue_position, status')
            .eq('appointment_id', appointment.id)
            .single();

          if (queueError) {
            console.error('Error fetching queue position:', queueError);
            return {
              ...appointment,
              doctor: {
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || '',
                specialization: doctor?.specialization || '',
                consultation_fee: doctor?.consultation_fee || 0
              },
              queue_position: {
                queue_position: 0,
                queue_status: 'unknown',
                ahead_count: 0,
                estimated_wait: 'Unknown'
              }
            };
          }

          // Count how many scheduled appointments are ahead in the queue
          const { data: aheadAppointments, error: countError } = await supabase
            .from('queue_positions')
            .select(`
              appointment_id,
              appointments!inner(status)
            `)
            .eq('doctor_id', appointment.doctor_id)
            .eq('appointment_date', appointmentDate)
            .lt('queue_position', queueData.queue_position)
            .eq('appointments.status', 'scheduled');

          if (countError) {
            console.error('Error counting ahead positions:', countError);
          }

          const aheadCount = aheadAppointments?.length || 0;
          
          // Estimate wait time (assuming 15 minutes per patient)
          const estimatedMinutes = aheadCount * 15;
          const estimatedWait = estimatedMinutes > 0 
            ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
            : 'Your turn now!';

          return {
            ...appointment,
            doctor: {
              first_name: profile?.first_name || '',
              last_name: profile?.last_name || '',
              specialization: doctor?.specialization || '',
              consultation_fee: doctor?.consultation_fee || 0
            },
            queue_position: {
              queue_position: queueData.queue_position,
              queue_status: queueData.status,
              ahead_count: aheadCount,
              estimated_wait: estimatedWait
            }
          };
        })
      );

      setAppointments(appointmentsWithQueue);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getQueueStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-orange-100 text-orange-700';
      case 'in_progress': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'skipped': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600">Book your first appointment to see it here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                </CardTitle>
                <CardDescription>
                  {appointment.doctor.specialization}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
                <Badge className={getQueueStatusColor(appointment.queue_position.queue_status)}>
                  Queue: {appointment.queue_position.queue_status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{format(new Date(appointment.appointment_date), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span>{appointment.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span>PKR {appointment.doctor.consultation_fee}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Queue Status
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-700">
                      Position: <span className="font-bold">#{appointment.queue_position.queue_position}</span>
                    </p>
                    <p className="text-blue-700">
                      People ahead: <span className="font-bold">{appointment.queue_position.ahead_count}</span>
                    </p>
                    <p className="text-blue-700">
                      Estimated wait: <span className="font-bold">{appointment.queue_position.estimated_wait}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Notes:</span> {appointment.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};