
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
import { DoctorScheduleDialog } from "@/components/dialogs/DoctorScheduleDialog";
import { CheckFreeDialog } from "@/components/dialogs/CheckFreeDialog";
import { useAppointments, usePatients, useDoctors } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, UserPlus, Receipt, Users, Clock, CreditCard, Search, FileText, Download, CalendarIcon, X, RotateCcw, Gift, AlertTriangle, Eye, Printer } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patientNumbers, setPatientNumbers] = useState<{[key: string]: string}>({});
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<{id: string, name: string} | null>(null);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  
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

  // Get emergency invoices for selected date
  const [emergencyInvoices, setEmergencyInvoices] = useState<any[]>([]);
  
  
  useEffect(() => {
    const fetchEmergencyInvoices = async () => {
      if (!selectedDate) return;
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .ilike('description', '%Emergency Consultation%')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });
      
      setEmergencyInvoices(invoices || []);
    };
    
    fetchEmergencyInvoices();

    // Set up real-time subscription for emergency invoices
    const channel = supabase
      .channel('emergency-invoices-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        (payload: any) => {
          console.log('🚨 Invoice updated, checking if emergency...', payload);
          // Check if it's an emergency invoice
          if ((payload.new && payload.new.description && payload.new.description.includes('Emergency Consultation')) || 
              (payload.old && payload.old.description && payload.old.description.includes('Emergency Consultation'))) {
            console.log('🚨 Emergency invoice detected, refetching...');
            fetchEmergencyInvoices();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const handleGenerateInvoice = async (appointment: any) => {
    setProcessingInvoice(appointment.id);
    try {
      // Get complete patient data with patient_number and profile information
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select(`
          patient_number,
          cnic,
          address,
          date_of_birth,
          blood_type,
          allergies,
          emergency_contact_name,
          emergency_contact_phone,
          profiles!patients_id_fkey(first_name, last_name, email, phone)
        `)
        .eq('id', appointment.patient_id)
        .single();

      console.log('Patient query result:', { patientData, patientError, patient_id: appointment.patient_id });
      
      if (patientError) {
        console.error('Error fetching patient data:', patientError);
      }

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
            description: `Consultation with ${getDoctorName(appointment.doctor_id, doctorNames || [])} - Patient: ${patientData?.patient_number || 'N/A'}`,
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
      
      // Create invoice object for PDF generation with complete patient information
      console.log('invoiceData from database:', JSON.stringify(invoiceData, null, 2));
      
      // We need to exclude the patient field from invoiceData to avoid conflicts
      const { patient: dbPatient, ...invoiceDataWithoutPatient } = invoiceData;
      console.log('dbPatient from database:', dbPatient);
      console.log('invoiceDataWithoutPatient:', invoiceDataWithoutPatient);
      
      const invoiceForPDF = {
        ...invoiceDataWithoutPatient,
        patient: {
          patient_number: patientData?.patient_number || 'N/A',
          cnic: patientData?.cnic || '',
          address: patientData?.address || '',
          date_of_birth: patientData?.date_of_birth || '',
          blood_type: patientData?.blood_type || '',
          allergies: patientData?.allergies || '',
          emergency_contact_name: patientData?.emergency_contact_name || '',
          emergency_contact_phone: patientData?.emergency_contact_phone || '',
          users: {
            first_name: patientData?.profiles?.first_name || patientName.split(' ')[0] || '',
            last_name: patientData?.profiles?.last_name || patientName.split(' ').slice(1).join(' ') || '',
            email: patientData?.profiles?.email || '',
            phone: patientData?.profiles?.phone || ''
          }
        }
      };

      console.log('Patient data for PDF:', { 
        patientData, 
        patient_number: patientData?.patient_number,
        invoiceForPDF: invoiceForPDF.patient 
      });

      // Generate and open PDF
      console.log('About to call generateInvoicePDF with:', JSON.stringify(invoiceForPDF, null, 2));
      console.log('Specifically patient.patient_number:', invoiceForPDF.patient?.patient_number);
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

  // Removed cancel appointment function - doctors can now cancel their own appointments

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
        <CheckFreeDialog />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Emergency ({emergencyInvoices.length})
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

        {/* Emergency Tab */}
        <TabsContent value="emergency" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Emergency Consultations - {format(selectedDate, "PPP")} ({emergencyInvoices.length} consultations)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emergencyInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emergencyInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {format(new Date(invoice.created_at), 'h:mm a')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {invoice.description.replace('Emergency Consultation - ', '')}
                          </TableCell>
                          <TableCell className="font-medium">
                            Rs. {invoice.amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Printer className="w-3 h-3 mr-1" />
                              Reprint
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Emergency Consultations</h3>
                  <p className="text-gray-600 mb-6">
                    No emergency consultations found for {format(selectedDate, "PPP")}
                  </p>
                  <div className="flex justify-center">
                    <EmergencyConsultationDialog />
                  </div>
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Note:</strong> Emergency consultations are processed immediately with payment and added to hospital revenue.
                    </p>
                  </div>
                </div>
              )}
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
            <div className="space-y-4">
              {/* Doctor Search */}
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors by name or specialization..."
                  value={doctorSearchTerm}
                  onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {doctorSearchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDoctorSearchTerm("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Doctors List */}
              <div className="space-y-3">
                {doctorsLoading ? (
                  <div className="animate-pulse space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ) : (() => {
                  // Filter doctors based on search term
                  const filteredDoctors = doctors?.filter(doctor => {
                    if (!doctorSearchTerm) return true;
                    const doctorName = getDoctorName(doctor.id, doctorNames || []).toLowerCase();
                    const specialization = (doctor.specialization || '').toLowerCase();
                    const search = doctorSearchTerm.toLowerCase();
                    return doctorName.includes(search) || specialization.includes(search);
                  }) || [];

                  return filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setSelectedDoctorForSchedule({
                        id: doctor.id, 
                        name: getDoctorName(doctor.id, doctorNames || [])
                      })}>
                        <div>
                          <p className="font-medium">
                            {getDoctorName(doctor.id, doctorNames || [])}
                          </p>
                          <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">Available</p>
                            <p className="text-xs text-gray-500">
                              {filteredAppointments.filter(apt => apt.doctor_id === doctor.id).length} appointments
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDoctorForSchedule({
                                id: doctor.id, 
                                name: getDoctorName(doctor.id, doctorNames || [])
                              });
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {doctorSearchTerm ? `No doctors found matching "${doctorSearchTerm}"` : "No doctors available"}
                    </p>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Schedule Dialog */}
      <DoctorScheduleDialog
        isOpen={!!selectedDoctorForSchedule}
        onClose={() => setSelectedDoctorForSchedule(null)}
        doctorId={selectedDoctorForSchedule?.id || null}
        doctorName={selectedDoctorForSchedule?.name || ''}
      />
    </div>
  );
}
