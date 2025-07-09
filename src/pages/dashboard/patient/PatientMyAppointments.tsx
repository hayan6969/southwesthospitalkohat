import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrCurrency } from "@/utils/currency";
import { format } from "date-fns";

interface AppointmentWithQueue {
  id: string;
  appointment_date: string;
  type: string;
  notes: string | null;
  status: string;
  doctor: {
    first_name: string;
    last_name: string;
    specialization: string;
    consultation_fee: number;
  };
  queue_position: {
    queue_number: number;
    estimated_time: string | null;
  } | null;
}

export default function PatientMyAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
    
    // Set up real-time subscription for queue updates
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_positions'
        },
        () => {
          loadAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          type,
          notes,
          status,
          doctors!inner(
            consultation_fee,
            specialization,
            profiles!inner(first_name, last_name)
          ),
          queue_positions(
            queue_number,
            estimated_time
          )
        `)
        .eq('patient_id', profile?.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data?.map(appointment => ({
        id: appointment.id,
        appointment_date: appointment.appointment_date,
        type: appointment.type,
        notes: appointment.notes,
        status: appointment.status,
        doctor: {
          first_name: appointment.doctors.profiles.first_name,
          last_name: appointment.doctors.profiles.last_name,
          specialization: appointment.doctors.specialization || 'General Medicine',
          consultation_fee: appointment.doctors.consultation_fee || 0
        },
        queue_position: appointment.queue_positions?.[0] || null
      })) || [];

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error("Failed to load appointments");
    }
    setLoading(false);
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success("Appointment cancelled successfully");
      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error("Failed to cancel appointment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />Rescheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQueueInfo = (appointment: AppointmentWithQueue) => {
    if (!appointment.queue_position) return null;
    
    const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
    const queueNumber = appointment.queue_position.queue_number;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">Queue Information</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Queue Number:</span>
            <span className="font-bold text-blue-900">#{queueNumber}</span>
          </div>
          {isToday && appointment.status === 'scheduled' && (
            <div className="text-blue-600 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Real-time updates available</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && new Date(apt.appointment_date) >= new Date()
  );
  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || apt.status === 'cancelled' || 
    (apt.status === 'scheduled' && new Date(apt.appointment_date) < new Date())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Appointments</h2>
        <p className="text-gray-600">Track your appointments and queue status</p>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming Appointments ({upcomingAppointments.length})
        </h3>
        
        {upcomingAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming appointments</p>
                <p className="text-sm">Book a new appointment to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span>{appointment.doctor.specialization}</span>
                        <span>•</span>
                        <span>{formatPkrCurrency(appointment.doctor.consultation_fee)}</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{format(new Date(appointment.appointment_date), 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{appointment.type}</span>
                      </div>
                      {appointment.notes && (
                        <div className="text-sm text-gray-600">
                          <strong>Notes:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelAppointment(appointment.id)}
                          className="self-start text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel Appointment
                        </Button>
                      )}
                    </div>
                  </div>
                  {getQueueInfo(appointment)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Past Appointments ({pastAppointments.length})
          </h3>
          
          <div className="grid gap-4">
            {pastAppointments.map((appointment) => (
              <Card key={appointment.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span>{appointment.doctor.specialization}</span>
                        <span>•</span>
                        <span>{format(new Date(appointment.appointment_date), 'PPP')}</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{appointment.type}</span>
                  </div>
                  {appointment.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Notes:</strong> {appointment.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}