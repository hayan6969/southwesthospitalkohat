
import { useState, useEffect, useMemo } from "react";
import { useAppointments, useUpdateAppointment, useMarkAppointmentFree } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { Calendar, Clock, User, Edit3, CheckCircle, X, Hash, CreditCard, AlertTriangle, Filter, Search, CalendarIcon, Gift, Pill, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { formatDateForDisplay, formatTimeForDisplay } from "@/utils/timezone";
import { toast } from "sonner";
import { PatientDetailDialog } from "@/components/dialogs/PatientDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getCurrentPakistanTime, formatInPakistanTime } from "@/utils/timezone";
import { PrescriptionDialog } from "@/components/dialogs/PrescriptionDialog";

export default function DoctorSchedule() { // Fixed ordering syntax
  const { data: appointments, isLoading, refetch: refetchAppointments } = useAppointments();
  const updateAppointment = useUpdateAppointment();
  const markAppointmentFree = useMarkAppointmentFree();
  const { data: patientNames } = usePatientNames();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [appointmentsWithQueue, setAppointmentsWithQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentPakistanTime()); // Default to today
  const [dateFilter, setDateFilter] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Prescription dialog state
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState<any>(null);

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

        // Fetch invoice data to check for free status
        const appointmentsWithInvoices = await Promise.all(
          appointments.map(async (appointment) => {
            let invoice = null;
            if (appointment.payment_status === 'paid') {
              // Try to find the invoice for this appointment
              const { data: invoiceData } = await supabase
                .from('invoices')
                .select('amount, description')
                .eq('patient_id', appointment.patient_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              invoice = invoiceData;
            }
            return { ...appointment, invoice };
          })
        );

        const enrichedAppointments = appointmentsWithInvoices.map(apt => {
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

  // Queue cleanup (no auto-cancellation)
  useEffect(() => {
    // Cleanup function to remove completed/cancelled appointments from queue
    const cleanupQueue = async () => {
      try {
        console.log('Cleaning up queue positions for completed/cancelled appointments...');
        
        // Remove queue positions for non-scheduled appointments
        const { error } = await supabase
          .from('queue_positions')
          .delete()
          .not('appointment_id', 'in', `(
            SELECT id FROM appointments 
            WHERE status = 'scheduled'
          )`);

        if (error) {
          console.error('Error cleaning up queue:', error);
        } else {
          console.log('Queue cleanup completed');
        }
      } catch (error) {
        console.error('Error in queue cleanup:', error);
      }
    };

    // Run cleanup every 5 minutes
    const interval = setInterval(cleanupQueue, 300000);
    
    // Run initial cleanup
    cleanupQueue();

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
        .maybeSingle();

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

  const [showMarkFreeDialog, setShowMarkFreeDialog] = useState<{appointmentId: string, appointment: any} | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<string | null>(null);

  const handleMarkFreeClick = (appointmentId: string, appointment: any) => {
    // Only allow marking as free if payment is already paid
    if (appointment.payment_status !== 'paid' && appointment.booking_type !== 'counter') {
      toast.error('Can only mark paid appointments as free');
      return;
    }
    setShowMarkFreeDialog({appointmentId, appointment});
  };

  const handleMarkFreeConfirm = async () => {
    if (!showMarkFreeDialog) return;
    
    try {
      await markAppointmentFree.mutateAsync(showMarkFreeDialog.appointmentId);
      toast.success('Appointment marked as free (PKR 0)');
      setShowMarkFreeDialog(null);
      // Refresh appointments to show updated status immediately
      await refetchAppointments();
    } catch (error) {
      toast.error('Failed to mark appointment as free');
      setShowMarkFreeDialog(null);
    }
  };

   const handleCancelAppointment = async (appointmentId: string) => {
    setCancellingAppointment(appointmentId);
    try {
      // Get appointment details before cancelling
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_id, doctor_id')
        .eq('id', appointmentId)
        .single();

      await updateAppointment.mutateAsync({
        id: appointmentId,
        status: 'cancelled' as any,
        updated_at: new Date().toISOString()
      });

      // Also cancel related invoices
      if (appointmentData) {
        await supabase
          .from('invoices')
          .update({ status: 'cancelled' })
          .eq('patient_id', appointmentData.patient_id)
          .eq('doctor_id', appointmentData.doctor_id)
          .neq('status', 'cancelled');
      }

      toast.success('Appointment cancelled successfully');
      refetchAppointments();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    } finally {
      setCancellingAppointment(null);
    }
  };

  const handlePatientClick = async (patientId: string, patientName: string) => {
    try {
      // Fetch complete patient data for the dialog
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError || profileError) {
        console.error('Error fetching patient data:', patientError || profileError);
        toast.error('Failed to load patient details');
        return;
      }

      // Combine patient and profile data
      const combinedPatient = {
        ...patientData,
        profiles: profileData
      };

      setSelectedPatient(combinedPatient);
      setIsPatientDialogOpen(true);
    } catch (error) {
      console.error('Error loading patient details:', error);
      toast.error('Failed to load patient details');
    }
  };

  // Removed handleGenerateInvoice - only staff can generate invoices

  const handlePrescriptionClick = (appointment: any) => {
    setSelectedAppointmentForPrescription(appointment);
    setIsPrescriptionDialogOpen(true);
  };

  const upcomingAppointments = appointmentsWithQueue?.filter(apt => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const aptDateStr = formatInPakistanTime(apt.appointment_date, 'yyyy-MM-dd');
    return apt.status === 'scheduled' && aptDateStr === selectedDateStr;
  }).sort((a, b) => {
    if (a.queue_position && b.queue_position) {
      return a.queue_position - b.queue_position;
    }
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  }) || [];

  // Filter past appointments based on user inputs
  const filteredPastAppointments = useMemo(() => {
    const filtered = appointmentsWithQueue?.filter(apt => {
      const isPastAppointment = apt.status === 'completed' || apt.status === 'cancelled' || 
        (new Date(apt.appointment_date) < new Date() && apt.status !== 'scheduled');
      
      if (!isPastAppointment) return false;
      
      // Apply filters
      if (dateFilter && !formatInPakistanTime(apt.appointment_date, 'yyyy-MM-dd').includes(dateFilter)) {
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
    
    return filtered;
  }, [appointmentsWithQueue, dateFilter, patientFilter, statusFilter, patientNames]);

  // Paginated past appointments
  const paginatedPastAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPastAppointments.slice(startIndex, endIndex);
  }, [filteredPastAppointments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPastAppointments.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, patientFilter, statusFilter]);

  // Remove the separate PatientDetailsView rendering
  // Now we'll use the PatientDetailDialog instead

  const renderAppointmentTable = (appointmentsList: any[], title: string) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px] text-center">Queue #</TableHead>
              <TableHead className="w-[140px]">Date & Time</TableHead>
              <TableHead className="w-[140px]">Patient</TableHead>
              <TableHead className="w-[90px]">Patient ID</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[130px]">Payment</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="min-w-[280px]">Actions</TableHead>
              <TableHead className="w-[110px]">Prescription</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || loading) ? (
               Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                   {Array.from({ length: 9 }).map((_, j) => (
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
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
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
                          {formatDateForDisplay(appointment.appointment_date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTimeForDisplay(appointment.appointment_date)}
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
                      {appointment.cleared_at ? (
                        <Badge variant="default" className="bg-purple-100 text-purple-700">
                          <Gift className="w-3 h-3 mr-1" />
                          Free Appointment
                        </Badge>
                      ) : appointment.booking_type === 'counter' ? (
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
                    {appointment.status === 'completed' && appointment.cleared_at ? (
                      <Badge className="bg-purple-100 text-purple-700">
                        Completed (Free)
                      </Badge>
                    ) : (
                      <Badge className={
                        appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {appointment.status}
                      </Badge>
                    )}
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
                            onClick={() => handleCancelAppointment(appointment.id)}
                            disabled={cancellingAppointment === appointment.id}
                          >
                            <X className="w-3 h-3 mr-1" />
                            {cancellingAppointment === appointment.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                           {/* Free button - only show after payment is made and not already marked as free */}
                          {(appointment.payment_status === 'paid' || appointment.booking_type === 'counter') && !appointment.cleared_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkFreeClick(appointment.id, appointment)}
                              disabled={markAppointmentFree.isPending}
                              className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                            >
                              <Gift className="w-3 h-3 mr-1" />
                              Mark Free
                            </Button>
                          )}
                          {/* Show "Marked as Free" if already marked */}
                          {appointment.cleared_at && (
                            <Badge className="bg-purple-100 text-purple-700">
                              <Gift className="w-3 h-3 mr-1" />
                              Marked as Free
                            </Badge>
                          )}
                        </>
                       )}
                     </div>
                   </TableCell>
                   
                   {/* Prescription */}
                   <TableCell>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handlePrescriptionClick(appointment)}
                       className="flex items-center gap-2"
                     >
                       <Pill className="w-3 h-3" />
                       Prescription
                     </Button>
                   </TableCell>
                </TableRow>
              ))
            ) : (
               <TableRow>
                 <TableCell colSpan={9} className="text-center text-gray-500 py-12">
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
            
            <div className="space-y-4">
              {renderAppointmentTable(paginatedPastAppointments, "Past Appointments")}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPastAppointments.length)} to {Math.min(currentPage * itemsPerPage, filteredPastAppointments.length)} of {filteredPastAppointments.length} past appointments
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            const start = Math.max(1, currentPage - 2);
                            const end = Math.min(totalPages, currentPage + 2);
                            return page >= start && page <= end;
                          })
                          .map(page => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mark as Free Confirmation Dialog */}
      <AlertDialog open={!!showMarkFreeDialog} onOpenChange={() => setShowMarkFreeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Appointment as Free</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this appointment as free? This will set the consultation fee to PKR 0 and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkFreeConfirm}
              disabled={markAppointmentFree.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {markAppointmentFree.isPending ? 'Processing...' : 'Mark as Free'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Patient Detail Dialog */}
      <PatientDetailDialog
        isOpen={isPatientDialogOpen}
        onClose={() => {
          setIsPatientDialogOpen(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
      />

      {/* Prescription Dialog */}
      <PrescriptionDialog
        open={isPrescriptionDialogOpen}
        onOpenChange={setIsPrescriptionDialogOpen}
        appointment={selectedAppointmentForPrescription}
        patientName={selectedAppointmentForPrescription ? 
          getPatientName(selectedAppointmentForPrescription.patient_id, patientNames || []) : 
          ""
        }
        patientId={selectedAppointmentForPrescription?.patient_number || ""}
      />
    </div>
  );
}
