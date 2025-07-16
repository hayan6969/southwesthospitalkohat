
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { PatientDialog } from "@/components/dialogs/PatientDialog";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { EmergencyConsultationDialog } from "@/components/dialogs/EmergencyConsultationDialog";
import { useAppointments, usePatients, useDoctors } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, UserPlus, Receipt, Users, Clock, CreditCard, Printer, Search, FileText, Download, CalendarIcon, X, RotateCcw, Gift } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { cn } from "@/lib/utils";

export function StaffCounter() {
  const { data: appointmentsData, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const [searchTerm, setSearchTerm] = useState("");
  const [processingInvoice, setProcessingInvoice] = useState<string | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patientNumbers, setPatientNumbers] = useState<{[key: string]: string}>({});
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Fetch appointments with invoice data to check for free status
  useEffect(() => {
    const fetchAppointmentsWithInvoices = async () => {
      if (!appointmentsData) return;
      
      const appointmentsWithInvoices = await Promise.all(
        appointmentsData.map(async (appointment) => {
          if (appointment.payment_status === 'paid') {
            // Try to find the invoice for this appointment
            const { data: invoice } = await supabase
              .from('invoices')
              .select('amount, description')
              .eq('patient_id', appointment.patient_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            return { ...appointment, invoice };
          }
          return appointment;
        })
      );
      
      setAppointments(appointmentsWithInvoices);
    };
    
    fetchAppointmentsWithInvoices();
  }, [appointmentsData]);

  // Get appointments for selected date (including all statuses)
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointment_date);
      return isSameDay(appointmentDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  // Fetch patient numbers for appointments
  useEffect(() => {
    const fetchPatientNumbers = async () => {
      if (!filteredAppointments?.length) return;
      
      const uniquePatientIds = [...new Set(filteredAppointments.map(apt => apt.patient_id))];
      
      const { data: patientData } = await supabase
        .from('patients')
        .select('id, patient_number')
        .in('id', uniquePatientIds);
      
      if (patientData) {
        const numbers: {[key: string]: string} = {};
        patientData.forEach(patient => {
          numbers[patient.id] = patient.patient_number || 'N/A';
        });
        setPatientNumbers(numbers);
      }
    };
    
    fetchPatientNumbers();
  }, [filteredAppointments]);

  // Fetch queue positions to calculate people ahead
  const [queuePositions, setQueuePositions] = useState<{[key: string]: { position: number; aheadCount: number }}>({});

  useEffect(() => {
    const fetchQueuePositions = async () => {
      if (!filteredAppointments?.length) return;
      
      const appointmentIds = filteredAppointments.map(apt => apt.id);
      
      const { data: queueData } = await supabase
        .from('queue_positions')
        .select('appointment_id, queue_position, doctor_id, appointment_date')
        .in('appointment_id', appointmentIds);
      
      if (queueData) {
        const positions: {[key: string]: { position: number; aheadCount: number }} = {};
        
        // Calculate ahead count for each appointment
        for (const queue of queueData) {
          // Count how many scheduled appointments are ahead in the queue
          const { data: aheadAppointments } = await supabase
            .from('queue_positions')
            .select(`
              appointment_id,
              appointments!inner(status)
            `)
            .eq('doctor_id', queue.doctor_id)
            .eq('appointment_date', queue.appointment_date)
            .lt('queue_position', queue.queue_position)
            .eq('appointments.status', 'scheduled');

          const aheadCount = aheadAppointments?.length || 0;
          
          positions[queue.appointment_id] = {
            position: queue.queue_position,
            aheadCount: aheadCount
          };
        }
        
        setQueuePositions(positions);
      }
    };
    
    fetchQueuePositions();
  }, [filteredAppointments]);

  // Get upcoming appointments (scheduled only)
  const upcomingAppointments = useMemo(() => {
    let filtered = filteredAppointments.filter(apt => apt.status === 'scheduled');
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt => {
        const patientName = getPatientName(apt.patient_id, patientNames || []).toLowerCase();
        const doctorName = getDoctorName(apt.doctor_id, doctorNames || []).toLowerCase();
        const patientNumber = patientNumbers[apt.patient_id] || '';
        const patientId = apt.patient_id.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return patientName.includes(search) || 
               doctorName.includes(search) || 
               patientNumber.toLowerCase().includes(search) ||
               patientId.includes(search);
      });
    }
    
    // Sort by queue position if available, otherwise by appointment time
    return filtered.sort((a, b) => {
      const aQueue = queuePositions[a.id];
      const bQueue = queuePositions[b.id];
      
      if (aQueue && bQueue) {
        return aQueue.position - bQueue.position;
      }
      
      return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
    });
  }, [filteredAppointments, searchTerm, patientNames, doctorNames, queuePositions]);

  // Get past appointments (completed and cancelled)
  const pastAppointments = useMemo(() => {
    let filtered = filteredAppointments.filter(apt => 
      apt.status === 'completed' || apt.status === 'cancelled'
    );
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt => {
        const patientName = getPatientName(apt.patient_id, patientNames || []).toLowerCase();
        const doctorName = getDoctorName(apt.doctor_id, doctorNames || []).toLowerCase();
        const patientNumber = patientNumbers[apt.patient_id] || '';
        const patientId = apt.patient_id.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return patientName.includes(search) || 
               doctorName.includes(search) || 
               patientNumber.toLowerCase().includes(search) ||
               patientId.includes(search);
      });
    }
    
    // Sort by appointment date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
  }, [filteredAppointments, searchTerm, patientNames, doctorNames]);

  const handleGenerateInvoice = async (appointment: any) => {
    setProcessingInvoice(appointment.id);
    try {
      // Get patient data with patient_number
      const { data: patientData } = await supabase
        .from('patients')
        .select('patient_number')
        .eq('id', appointment.patient_id)
        .single();

      // First, check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', appointment.patient_id)
        .eq('description', `Consultation with ${getDoctorName(appointment.doctor_id, doctorNames || [])}`)
        .single();

      let invoiceData;
      
      if (existingInvoice) {
        // Update existing invoice to paid
        const { data, error } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();
        
        if (error) throw error;
        invoiceData = data;
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from('invoices')
          .insert({
            patient_id: appointment.patient_id,
            amount: 5000, // Default consultation fee
            status: 'paid',
            paid_at: new Date().toISOString(),
            invoice_number: `INV-${Date.now()}`,
            description: `Consultation with ${getDoctorName(appointment.doctor_id, doctorNames || [])}`,
            due_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();
        
        if (error) throw error;
        invoiceData = data;
      }

      // Update appointment payment status
      await supabase
        .from('appointments')
        .update({ 
          payment_status: 'paid',
          invoice_generated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      // Generate and open PDF
      const patientName = getPatientName(appointment.patient_id, patientNames || []);
      const doctorName = getDoctorName(appointment.doctor_id, doctorNames || []);
      
      // Create invoice object for PDF generation with patient_number
      const invoiceForPDF = {
        ...invoiceData,
        patient: {
          patient_number: patientData?.patient_number || 'N/A',
          users: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: ''
          }
        }
      };

      // Generate and open PDF
      await generateInvoicePDF(invoiceForPDF);
      
      toast({
        title: "Invoice Generated",
        description: "Invoice has been generated and marked as paid",
      });
      
      // Refresh appointments
      refetchAppointments();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setProcessingInvoice(null);
    }
  };

  const handleCancelAppointment = async (appointment: any) => {
    setCancellingAppointment(appointment.id);
    try {
      // Update appointment status to cancelled
      await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      // If the appointment was paid, we need to handle revenue removal
      if (appointment.payment_status === 'paid') {
        // Update any existing invoice to refund/cancelled status
        await supabase
          .from('invoices')
          .update({ 
            status: 'pending', // Or create a 'refunded' status
            paid_at: null
          })
          .eq('patient_id', appointment.patient_id)
          .eq('description', `Consultation with ${getDoctorName(appointment.doctor_id, doctorNames || [])}`);
      }

      // Update queue position status
      await supabase
        .from('queue_positions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointment.id);

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled and revenue has been adjusted",
      });
      
      // Refresh appointments
      refetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setCancellingAppointment(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Patients waiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">On duty today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAppointments.filter(apt => apt.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Selected date</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <EnhancedAppointmentDialog />
        <PatientDialog />
        <InvoiceDialog />
        <EmergencyConsultationDialog />
        <Button variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Patient Card
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by patient name, patient number, doctor name, or patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedDate(new Date());
            }}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Appointments Tab */}
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Appointments - {format(selectedDate, "PPP")} ({upcomingAppointments.length} appointments)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>People Ahead</TableHead>
                      <TableHead>Booking Type</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointmentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="animate-pulse">Loading appointments...</div>
                        </TableCell>
                      </TableRow>
                    ) : upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map((appointment, index) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-bold">#{queuePositions[appointment.id]?.position || (index + 1)}</TableCell>
                          <TableCell className="font-mono text-sm font-medium">
                            {patientNumbers[appointment.patient_id] || 'Loading...'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getPatientName(appointment.patient_id, patientNames || [])}
                          </TableCell>
                          <TableCell>
                            {getDoctorName(appointment.doctor_id, doctorNames || [])}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {queuePositions[appointment.id]?.aheadCount ?? 0}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {queuePositions[appointment.id]?.aheadCount === 0 ? "Next" : "waiting"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={appointment.booking_type === 'online' ? 'default' : 'secondary'}>
                              {appointment.booking_type || 'walk-in'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                                {appointment.payment_status || 'pending'}
                              </Badge>
                              {/* Check if appointment is marked as free */}
                              {(appointment.invoice?.amount === 0 || appointment.invoice?.description?.includes('Free')) && (
                                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                                  <Gift className="w-3 h-3 mr-1" />
                                  Marked as Free
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {/* Cancel appointment with confirmation dialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    disabled={cancellingAppointment === appointment.id}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this appointment? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleCancelAppointment(appointment)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Cancel Appointment
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Generate Invoice button */}
                              <Button
                                size="sm"
                                onClick={() => handleGenerateInvoice(appointment)}
                                disabled={processingInvoice === appointment.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Receipt className="w-3 h-3 mr-1" />
                                {processingInvoice === appointment.id ? 'Processing...' : 'Generate Invoice'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                          No upcoming appointments found for {format(selectedDate, "PPP")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Past Appointments Tab */}
        <TabsContent value="past" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Past Appointments - {format(selectedDate, "PPP")} ({pastAppointments.length} appointments)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Booking Type</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointmentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="animate-pulse">Loading appointments...</div>
                        </TableCell>
                      </TableRow>
                    ) : pastAppointments.length > 0 ? (
                      pastAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">
                            {format(new Date(appointment.appointment_date), 'h:mm a')}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">
                            {patientNumbers[appointment.patient_id] || 'Loading...'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getPatientName(appointment.patient_id, patientNames || [])}
                          </TableCell>
                          <TableCell>
                            {getDoctorName(appointment.doctor_id, doctorNames || [])}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={appointment.booking_type === 'online' ? 'default' : 'secondary'}>
                              {appointment.booking_type || 'walk-in'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                                {appointment.payment_status || 'pending'}
                              </Badge>
                              {/* Check if appointment is marked as free */}
                              {(appointment.invoice?.amount === 0 || appointment.invoice?.description?.includes('Free')) && (
                                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                                  <Gift className="w-3 h-3 mr-1" />
                                  Marked as Free
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <FileText className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                          No past appointments found for {format(selectedDate, "PPP")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Doctors Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Doctors Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {doctorsLoading ? (
                <div className="animate-pulse space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ) : doctors && doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <div key={doctor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {getDoctorName(doctor.id, doctorNames || [])}
                      </p>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">Available</p>
                      <p className="text-xs text-gray-500">
                        {filteredAppointments.filter(apt => apt.doctor_id === doctor.id).length} appointments
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No doctors available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
