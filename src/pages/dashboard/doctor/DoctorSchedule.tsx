
import { useState, useEffect } from "react";
import { useAppointments, useUpdateAppointment } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { Calendar, Clock, User, Edit3, CheckCircle, X, Hash, CreditCard, AlertTriangle, Filter, Search, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { PatientDetailsView } from "@/components/PatientDetailsView";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getCurrentPakistanTime } from "@/utils/timezone";

export default function DoctorSchedule() { // Fixed ordering syntax
  const { data: appointments, isLoading } = useAppointments();
  const updateAppointment = useUpdateAppointment();
  const { data: patientNames } = usePatientNames();
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [appointmentsWithQueue, setAppointmentsWithQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentPakistanTime()); // Default to today
  const [dateFilter, setDateFilter] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch appointments with queue positions and patient details
  useEffect(() => {
    const fetchAppointmentsWithDetails = async () => {
      if (!appointments) return;
      
      setLoading(true);
      try {
        const { data: queueData } = await supabase
          .from('queue_positions')
          .select('appointment_id, queue_position, status')
          .order('queue_position');

        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, cnic, patient_number');

        const enrichedAppointments = appointments.map(apt => {
          const queueInfo = queueData?.find(q => q.appointment_id === apt.id);
          const patientInfo = patientsData?.find(p => p.id === apt.patient_id);
          
          return {
            ...apt,
            queue_position: queueInfo?.queue_position || null,
            queue_status: queueInfo?.status || 'waiting',
            patient_cnic: patientInfo?.cnic || 'N/A',
            patient_number: patientInfo?.patient_number || 'N/A'
          };
        });

        setAppointmentsWithQueue(enrichedAppointments);
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentsWithDetails();
  }, [appointments]);

  // Auto-cancel overdue appointments and manage payment timers
  useEffect(() => {
    // Check and set payment timers for patients who are now first in queue
    const managePaymentTimers = async () => {
      try {
        // Get all doctors with scheduled appointments today
        const today = new Date().toISOString().split('T')[0];
        
        const { data: doctors, error: doctorsError } = await supabase
          .from('appointments')
          .select('doctor_id')
          .eq('status', 'scheduled')
          .gte('appointment_date', today)
          .lt('appointment_date', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        if (doctorsError) {
          console.error('Error fetching doctors:', doctorsError);
          return;
        }

        const uniqueDoctorIds = [...new Set(doctors?.map(d => d.doctor_id) || [])];

        // For each doctor, check who is first in queue and needs a payment timer
        for (const doctorId of uniqueDoctorIds) {
          // First get queue positions for this doctor today
          const { data: queuePositions, error: queueError } = await supabase
            .from('queue_positions')
            .select('appointment_id, queue_position')
            .eq('doctor_id', doctorId)
            .eq('appointment_date', today)
            .order('queue_position', { ascending: true })
            .limit(1);

          if (queueError) {
            console.error('Error finding queue positions:', queueError);
            continue;
          }

          const firstQueuePosition = queuePositions?.[0];
          if (!firstQueuePosition) continue;

          // Now get the appointment details for the first in queue
          const { data: firstInQueue, error } = await supabase
            .from('appointments')
            .select('id, payment_status, booking_type, payment_due_time')
            .eq('id', firstQueuePosition.appointment_id)
            .eq('status', 'scheduled')
            .single();

          if (error) {
            console.error('Error finding first in queue:', error);
            continue;
          }

          const firstAppointment = firstInQueue;
          console.log(`Doctor ${doctorId} - First in queue:`, firstAppointment);
          
          if (firstAppointment && 
              firstAppointment.payment_status === 'pending' && 
              firstAppointment.booking_type === 'online' && 
              !firstAppointment.payment_due_time) {
            
            // Set payment due time to 3 minutes from now
            const paymentDueTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
            console.log(`Setting payment due time for appointment ${firstAppointment.id} to ${paymentDueTime}`);
            
            const { error: updateError } = await supabase
              .from('appointments')
              .update({ payment_due_time: paymentDueTime })
              .eq('id', firstAppointment.id);

            if (updateError) {
              console.error('Error setting payment due time:', updateError);
            } else {
              console.log(`Successfully set 3-minute payment timer for first-in-queue appointment ${firstAppointment.id}`);
            }
          } else if (firstAppointment) {
            console.log(`First appointment ${firstAppointment.id} does not need timer - payment_status: ${firstAppointment.payment_status}, booking_type: ${firstAppointment.booking_type}, existing timer: ${firstAppointment.payment_due_time}`);
          }
        }
      } catch (error) {
        console.error('Error managing payment timers:', error);
      }
    };

    // Run initial timer management
    managePaymentTimers();

    const interval = setInterval(async () => {
      try {
        console.log('Running auto-cancellation check...');
        // Auto-cancel overdue appointments
        const { data: cancelResult, error: cancelError } = await supabase.rpc('auto_cancel_overdue_appointments');
        if (cancelError) {
          console.error('Error cancelling overdue appointments:', cancelError);
        } else {
          console.log('Auto-cancellation check completed');
        }
        
        // Manage payment timers for new first-in-queue patients
        await managePaymentTimers();
      } catch (error) {
        console.error('Error in scheduled tasks:', error);
      }
    }, 60000); // Run every minute

    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (appointmentId: string, newStatus: string, appointment: any) => {
    // Prevent completing appointments with pending payments
    if (newStatus === 'completed' && appointment.booking_type === 'online' && appointment.payment_status === 'pending') {
      toast.error('Cannot complete appointment with pending payment. Only staff can generate invoices.');
      return;
    }

    try {
      await updateAppointment.mutateAsync({
        id: appointmentId,
        status: newStatus as any,
        updated_at: new Date().toISOString()
      });

      // When an appointment is completed, set payment_due_time for the next patient in queue
      if (newStatus === 'completed') {
        await setPaymentDueTimeForNextPatient(appointment.doctor_id, appointment.appointment_date);
      }

      toast.success(`Appointment ${newStatus} successfully`);
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  };

  const setPaymentDueTimeForNextPatient = async (doctorId: string, appointmentDate: string) => {
    try {
      // Find the next patient in queue with pending payment
      const appointmentDateOnly = new Date(appointmentDate).toISOString().split('T')[0];
      
      // First get queue positions for this doctor today
      const { data: queuePositions, error: queueError } = await supabase
        .from('queue_positions')
        .select('appointment_id, queue_position')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', appointmentDateOnly)
        .order('queue_position', { ascending: true })
        .limit(1);

      if (queueError) {
        console.error('Error finding queue positions:', queueError);
        return;
      }

      const firstQueuePosition = queuePositions?.[0];
      if (!firstQueuePosition) return;

      // Now get the appointment details for the first in queue
      const { data: nextAppointments, error } = await supabase
        .from('appointments')
        .select('id, payment_status, booking_type')
        .eq('id', firstQueuePosition.appointment_id)
        .eq('status', 'scheduled')
        .single();

      if (error) {
        console.error('Error finding next appointment:', error);
        return;
      }

      const nextAppointment = nextAppointments;
      if (nextAppointment && 
          nextAppointment.payment_status === 'pending' && 
          nextAppointment.booking_type === 'online') {
        
        // Set payment due time to 3 minutes from now
        const paymentDueTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
        
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ payment_due_time: paymentDueTime })
          .eq('id', nextAppointment.id);

        if (updateError) {
          console.error('Error setting payment due time:', updateError);
        } else {
          console.log(`Set 3-minute payment timer for appointment ${nextAppointment.id}`);
          toast.success('Next patient has 3 minutes to complete payment');
        }
      }
    } catch (error) {
      console.error('Error in setPaymentDueTimeForNextPatient:', error);
    }
  };

  const handlePatientClick = (patientId: string, patientName: string) => {
    setSelectedPatient({ id: patientId, name: patientName });
  };

  // Removed handleGenerateInvoice - only staff can generate invoices

  const upcomingAppointments = appointmentsWithQueue?.filter(apt => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const aptDateStr = format(new Date(apt.appointment_date), 'yyyy-MM-dd');
    return apt.status === 'scheduled' && aptDateStr === selectedDateStr;
  }).sort((a, b) => {
    // Sort by queue position first, then by appointment time
    if (a.queue_position && b.queue_position) {
      return a.queue_position - b.queue_position;
    }
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  }) || [];

  // Filter past appointments based on user inputs
  const filteredPastAppointments = appointmentsWithQueue?.filter(apt => {
    const isPastAppointment = apt.status === 'completed' || apt.status === 'cancelled' || 
      (new Date(apt.appointment_date) < new Date() && apt.status !== 'scheduled');
    
    if (!isPastAppointment) return false;
    
    // Apply filters
    if (dateFilter && !format(new Date(apt.appointment_date), 'yyyy-MM-dd').includes(dateFilter)) {
      return false;
    }
    
    if (patientFilter) {
      const patientName = getPatientName(apt.patient_id, patientNames || []).toLowerCase();
      const patientNumber = apt.patient_number?.toLowerCase() || '';
      if (!patientName.includes(patientFilter.toLowerCase()) && 
          !patientNumber.includes(patientFilter.toLowerCase())) {
        return false;
      }
    }
    
    if (statusFilter && statusFilter !== "all" && apt.status !== statusFilter) {
      return false;
    }
    
    return true;
  }).sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()) || [];

  if (selectedPatient) {
    return (
      <PatientDetailsView
        patientId={selectedPatient.id}
        patientName={selectedPatient.name}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  const renderAppointmentTable = (appointmentsList: any[], title: string) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue #</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || loading) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : appointmentsList.length > 0 ? (
              appointmentsList.map((appointment) => (
                <TableRow key={appointment.id} className="hover:bg-gray-50">
                  {/* Queue Position */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-lg">
                        {appointment.queue_position || '-'}
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Date & Time */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(appointment.appointment_date), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Patient */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div 
                          className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                          onClick={() => handlePatientClick(
                            appointment.patient_id, 
                            getPatientName(appointment.patient_id, patientNames || [])
                          )}
                        >
                          {getPatientName(appointment.patient_id, patientNames || [])}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.patient_number}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Patient ID */}
                  <TableCell>
                    <span className="text-sm font-mono">
                      {appointment.patient_number}
                    </span>
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell>
                    <Badge variant="secondary">
                      {appointment.type}
                    </Badge>
                  </TableCell>
                  
                  {/* Payment Status */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {appointment.booking_type === 'counter' ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Paid (Counter)
                        </Badge>
                      ) : appointment.payment_status === 'paid' ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Paid (Online)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Pending Payment
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    <Badge className={
                      appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(appointment.id, 'completed', appointment)}
                            disabled={updateAppointment.isPending || (appointment.booking_type === 'online' && appointment.payment_status === 'pending')}
                            title={appointment.booking_type === 'online' && appointment.payment_status === 'pending' ? 'Cannot complete appointment with pending payment' : ''}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled', appointment)}
                            disabled={updateAppointment.isPending}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                  No {title.toLowerCase()} found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">Manage your appointments and view patient details</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Calendar className="w-4 h-4 mr-2" />
            Set Availability
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
          <TabsTrigger value="past">Past Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="space-y-4">
            {/* Date Filter for Upcoming Appointments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Select Date:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {renderAppointmentTable(upcomingAppointments, `Appointments for ${format(selectedDate, "PPP")}`)}
          </div>
        </TabsContent>

        <TabsContent value="past">
          <div className="space-y-4">
            {/* Filters for Past Appointments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="date-filter" className="text-sm">Date</Label>
                  <Input
                    id="date-filter"
                    type="date"
                    placeholder="Filter by date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="patient-filter" className="text-sm">Patient</Label>
                  <Input
                    id="patient-filter"
                    placeholder="Search by name or ID"
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter" className="text-sm">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDateFilter("");
                      setPatientFilter("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
            {renderAppointmentTable(filteredPastAppointments, "Past Appointments")}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
