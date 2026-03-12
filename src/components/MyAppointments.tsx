import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, User, Calendar as CalendarIcon, FileText, Banknote, Filter, CalendarDays, X, Gift } from "lucide-react";
import { format, isToday, isFuture, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AppointmentWithQueue {
  id: string;
  appointment_date: string;
  type: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  payment_status?: string;
  booking_type?: string;
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
  invoice?: {
    amount: number;
    description?: string;
  };
}

export const MyAppointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  
  // Date filtering states for different tabs
  const [upcomingDateRange, setUpcomingDateRange] = useState<{from?: Date; to?: Date}>({});
  const [completedDateRange, setCompletedDateRange] = useState<{from?: Date; to?: Date}>({});
  const [cancelledDateRange, setCancelledDateRange] = useState<{from?: Date; to?: Date}>({});

  useEffect(() => {
    fetchMyAppointments();
  }, [profile?.id]);

  // Set up real-time updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`patient-appointments-${profile.id}`) // Use unique channel name per user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${profile.id}`
        },
        () => {
          console.log('Patient appointments updated, refetching...');
          fetchMyAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_positions'
        },
        () => {
          console.log('Queue positions updated, refetching patient appointments...');
          fetchMyAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `patient_id=eq.${profile.id}`
        },
        () => {
          console.log('Patient invoices updated, refetching appointments...');
          fetchMyAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // Keep profile dependency but use unique channel name

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
          payment_status,
          booking_type,
          doctor_id
        `)
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        return;
      }

      // Get doctors data and invoices separately
      const doctorIds = appointmentsData.map(a => a.doctor_id);
      const [doctorsData, profilesData, invoicesData] = await Promise.all([
        supabase.from('doctors').select('id, specialization, consultation_fee').in('id', doctorIds),
        supabase.from('profiles').select('id, first_name, last_name').in('id', doctorIds),
        supabase.from('invoices').select('id, patient_id, amount, description').eq('patient_id', profile.id)
      ]);

      if (doctorsData.error) throw doctorsData.error;
      if (profilesData.error) throw profilesData.error;
      if (invoicesData.error) throw invoicesData.error;

      // For each appointment, get queue position and calculate ahead count
      const appointmentsWithQueue = await Promise.all(
        appointmentsData.map(async (appointment) => {
          const appointmentDateStr = new Date(appointment.appointment_date).toISOString().split('T')[0];
          
          // Get doctor, profile info, and latest invoice
          const doctor = doctorsData.data?.find(d => d.id === appointment.doctor_id);
          const doctorProfile = profilesData.data?.find(p => p.id === appointment.doctor_id);
          const latestInvoice = invoicesData.data?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          // Get this appointment's queue position
          const { data: queueData, error: queueError } = await supabase
            .from('queue_positions')
            .select('queue_position, status')
            .eq('appointment_id', appointment.id)
            .maybeSingle();

          if (queueError) {
            console.error('Error fetching queue position:', queueError);
          }

          let aheadCount = 0;
          if (queueData && appointment.status === 'scheduled') {
            // Count how many scheduled appointments are ahead in the queue
            const { data: aheadAppointments, error: countError } = await supabase
              .from('queue_positions')
              .select(`
                appointment_id,
                appointments!inner(status)
              `)
              .eq('doctor_id', appointment.doctor_id)
              .eq('appointment_date', appointmentDateStr)
              .lt('queue_position', queueData.queue_position)
              .eq('appointments.status', 'scheduled');

            if (countError) {
              console.error('Error counting ahead positions:', countError);
            } else {
              aheadCount = aheadAppointments?.length || 0;
            }
          }
          
          // Estimate wait time (assuming 15 minutes per patient)
          const estimatedMinutes = aheadCount * 15;
          const appointmentDate = new Date(appointment.appointment_date);
          const today = new Date();
          const isTodayAppointment = appointmentDate.toDateString() === today.toDateString();
          const isFutureAppointment = appointmentDate > today;
          
          let estimatedWait: string;
          if (appointment.status !== 'scheduled') {
            estimatedWait = 'N/A';
          } else if (isFutureAppointment) {
            // For future appointments, show queue position info
            estimatedWait = queueData?.queue_position === 1 
              ? `First appointment on ${format(appointmentDate, 'MMM dd')}`
              : `Position #${queueData?.queue_position || 0} on ${format(appointmentDate, 'MMM dd')}`;
          } else if (isTodayAppointment && estimatedMinutes > 0) {
            // For today with people ahead
            estimatedWait = `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;
          } else if (isTodayAppointment) {
            // For today with no one ahead
            estimatedWait = 'Your turn soon!';
          } else {
            // Fallback
            estimatedWait = 'N/A';
          }

          return {
            ...appointment,
            doctor: {
              first_name: doctorProfile?.first_name || '',
              last_name: doctorProfile?.last_name || '',
              specialization: doctor?.specialization || '',
              consultation_fee: doctor?.consultation_fee || 0
            },
            queue_position: {
              queue_position: queueData?.queue_position || 0,
              queue_status: queueData?.status || 'unknown',
              ahead_count: aheadCount,
              estimated_wait: estimatedWait
            },
            invoice: latestInvoice ? {
              amount: latestInvoice.amount,
              description: latestInvoice.description
            } : undefined
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

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      // Get the queue position data BEFORE making any changes
      const { data: queueData, error: queueFetchError } = await supabase
        .from('queue_positions')
        .select('doctor_id, appointment_date, queue_position')
        .eq('appointment_id', appointmentId)
        .single();

      if (queueFetchError) {
        console.error('Error fetching queue data:', queueFetchError);
        throw new Error('Could not retrieve appointment queue information');
      }

      // Update appointment status to cancelled
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Also cancel related invoices for this appointment
      const { data: relatedInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('patient_id', (await supabase.from('appointments').select('patient_id').eq('id', appointmentId).single()).data?.patient_id || '')
        .like('invoice_number', 'INV-%');
      
      // Find invoices created around the same time as this appointment
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_id, doctor_id, created_at')
        .eq('id', appointmentId)
        .single();

      if (appointmentData) {
        await supabase
          .from('invoices')
          .update({ status: 'cancelled' })
          .eq('patient_id', appointmentData.patient_id)
          .eq('doctor_id', appointmentData.doctor_id)
          .neq('status', 'cancelled');
      }

      // Update the queue position status to 'skipped'
      const { error: queueError } = await supabase
        .from('queue_positions')
        .update({ 
          status: 'skipped',
          updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId);

      if (queueError) throw queueError;

      // Reorder the queue for appointments after this one
      const { error: reorderError } = await supabase
        .rpc('reorder_queue_after_cancellation', {
          p_doctor_id: queueData.doctor_id,
          p_appointment_date: queueData.appointment_date,
          p_cancelled_position: queueData.queue_position
        });

      if (reorderError) {
        console.error('Error reordering queue:', reorderError);
        throw new Error('Failed to update queue positions');
      }

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled. The queue has been automatically updated.",
      });

      // Refresh appointments to reflect changes
      fetchMyAppointments();

    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filterAppointmentsByTab = (tab: string) => {
    const now = new Date();
    const today = startOfDay(now);
    const endToday = endOfDay(now);

    switch (tab) {
      case 'today':
        return appointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          return aptDate >= today && aptDate <= endToday;
        });
      
      case 'upcoming':
        let upcoming = appointments.filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          return aptDate > endToday && apt.status === 'scheduled';
        });
        
        // Apply date filtering
        if (upcomingDateRange.from || upcomingDateRange.to) {
          upcoming = upcoming.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            if (upcomingDateRange.from && aptDate < startOfDay(upcomingDateRange.from)) return false;
            if (upcomingDateRange.to && aptDate > endOfDay(upcomingDateRange.to)) return false;
            return true;
          });
        }
        return upcoming;
      
      case 'completed':
        let completed = appointments.filter(apt => apt.status === 'completed');
        
        // Apply date filtering
        if (completedDateRange.from || completedDateRange.to) {
          completed = completed.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            if (completedDateRange.from && aptDate < startOfDay(completedDateRange.from)) return false;
            if (completedDateRange.to && aptDate > endOfDay(completedDateRange.to)) return false;
            return true;
          });
        }
        return completed;
      
      case 'cancelled':
        let cancelled = appointments.filter(apt => apt.status === 'cancelled');
        
        // Apply date filtering
        if (cancelledDateRange.from || cancelledDateRange.to) {
          cancelled = cancelled.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            if (cancelledDateRange.from && aptDate < startOfDay(cancelledDateRange.from)) return false;
            if (cancelledDateRange.to && aptDate > endOfDay(cancelledDateRange.to)) return false;
            return true;
          });
        }
        return cancelled;
      
      default:
        return appointments;
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

  const DateRangeFilter = ({ 
    dateRange, 
    setDateRange, 
    label 
  }: { 
    dateRange: {from?: Date; to?: Date}; 
    setDateRange: (range: {from?: Date; to?: Date}) => void;
    label: string;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="text-xs sm:text-sm">
          <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Filter</span>
          {(dateRange.from || dateRange.to) && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">•</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={(date) => setDateRange({...dateRange, from: date})}
              className="pointer-events-auto"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={(date) => setDateRange({...dateRange, to: date})}
              disabled={(date) => dateRange.from ? date < dateRange.from : false}
              className="pointer-events-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDateRange({})}
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderAppointmentCard = (appointment: AppointmentWithQueue) => (
    <Card key={appointment.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</span>
            </CardTitle>
            <CardDescription className="text-sm">
              {appointment.doctor.specialization}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={`${getStatusColor(appointment.status)} text-xs`}>
              {appointment.status}
            </Badge>
            {appointment.status === 'scheduled' && (
              <Badge className={`${getQueueStatusColor(appointment.queue_position.queue_status)} text-xs`}>
                Queue: {appointment.queue_position.queue_status}
              </Badge>
            )}
            {appointment.invoice?.amount === 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                Free
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span>{format(new Date(appointment.appointment_date), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span>{appointment.type}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {appointment.invoice?.amount === 0 || appointment.invoice?.description?.includes('Free') ? (
                <>
                  <Gift className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-yellow-700 font-medium">PKR 0 (Free)</span>
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span>PKR {appointment.invoice?.amount || appointment.doctor.consultation_fee}</span>
                </>
              )}
            </div>
          </div>

          {appointment.status === 'scheduled' && (
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
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
          )}
        </div>

        {appointment.notes && (
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Notes:</span> {appointment.notes}
            </p>
          </div>
        )}

        {/* Cancel button for scheduled appointments */}
        {appointment.status === 'scheduled' && (
          <div className="pt-3 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <X className="w-4 h-4 mr-2" />
                  Cancel Appointment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel your appointment with Dr. {appointment.doctor.first_name} {appointment.doctor.last_name} on {format(new Date(appointment.appointment_date), 'PPP')}?
                    <br /><br />
                    This action cannot be undone. Your spot will be automatically freed and patients behind you in the queue will be moved up.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleCancelAppointment(appointment.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Cancel Appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTabContent = (tab: string) => {
    const filteredAppointments = filterAppointmentsByTab(tab);

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

    if (filteredAppointments.length === 0) {
      const emptyMessages = {
        today: "No appointments for today",
        upcoming: "No upcoming appointments",
        completed: "No completed appointments",
        cancelled: "No cancelled appointments"
      };

      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {emptyMessages[tab as keyof typeof emptyMessages]}
              </h3>
              <p className="text-gray-600">
                {tab === 'today' ? 'Enjoy your free day!' : 
                 tab === 'upcoming' ? 'Book an appointment to see it here.' :
                 'No appointments found for the selected criteria.'}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredAppointments.map(renderAppointmentCard)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-auto grid-cols-4">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Cancelled
            </TabsTrigger>
          </TabsList>

          {/* Date filters for other tabs */}
          {activeTab === 'upcoming' && (
            <DateRangeFilter 
              dateRange={upcomingDateRange}
              setDateRange={setUpcomingDateRange}
              label="Filter Dates"
            />
          )}
          {activeTab === 'completed' && (
            <DateRangeFilter 
              dateRange={completedDateRange}
              setDateRange={setCompletedDateRange}
              label="Filter Dates"
            />
          )}
          {activeTab === 'cancelled' && (
            <DateRangeFilter 
              dateRange={cancelledDateRange}
              setDateRange={setCancelledDateRange}
              label="Filter Dates"
            />
          )}
        </div>

        <TabsContent value="today">
          {renderTabContent('today')}
        </TabsContent>

        <TabsContent value="upcoming">
          {renderTabContent('upcoming')}
        </TabsContent>

        <TabsContent value="completed">
          {renderTabContent('completed')}
        </TabsContent>

        <TabsContent value="cancelled">
          {renderTabContent('cancelled')}
        </TabsContent>
      </Tabs>
    </div>
  );
};