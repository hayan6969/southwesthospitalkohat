
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
        
        // Get phone from patientNames (which includes phone & email)
        const patientProfile = patientNames?.find(p => p.id === apt.patient_id);
        const phone = patientProfile?.phone || '';
        // Extract phone from email pattern {phone}@patient.local
        const emailPhone = patientProfile?.email?.match(/^(\d+)@patient\.local$/)?.[1] || '';
        
        return patientName.includes(search) || 
               doctorName.includes(search) || 
               patientNumber.toLowerCase().includes(search) ||
               patientId.includes(search) ||
               phone.includes(search) ||
               emailPhone.includes(search);
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
        
        // Get phone from patientNames (which includes phone & email)
        const patientProfile = patientNames?.find(p => p.id === apt.patient_id);
        const phone = patientProfile?.phone || '';
        const emailPhone = patientProfile?.email?.match(/^(\d+)@patient\.local$/)?.[1] || '';
        
        return patientName.includes(search) || 
               doctorName.includes(search) || 
               patientNumber.toLowerCase().includes(search) ||
               patientId.includes(search) ||
               phone.includes(search) ||
               emailPhone.includes(search);
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
    if (processingInvoice === appointment.id) return;

    setProcessingInvoice(appointment.id);
    try {
      const { data: liveAppointment, error: liveAppointmentError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, payment_status, invoice_generated_at')
        .eq('id', appointment.id)
        .maybeSingle();

      if (liveAppointmentError) throw liveAppointmentError;

      const currentAppointment = liveAppointment || appointment;

      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', currentAppointment.doctor_id)
        .maybeSingle();

      if (doctorError) {
        console.error('Error fetching doctor data:', doctorError);
        toast({
          title: 'Error',
          description: 'Failed to fetch doctor consultation fee',
          variant: 'destructive',
        });
        return;
      }

      const consultationFee = doctorData?.consultation_fee || 0;

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
        .eq('id', currentAppointment.patient_id)
        .maybeSingle();

      console.log('Patient query result:', { patientData, patientError, patient_id: currentAppointment.patient_id });

      if (patientError) {
        console.error('Error fetching patient data:', patientError);
      }

      const doctorName = getDoctorName(currentAppointment.doctor_id, doctorNames || []);
      const consultationDescriptionPattern = `Consultation with ${doctorName} - Patient: ${patientData?.patient_number || 'N/A'}`;

      // Check for existing invoice: first by description match, then by patient+doctor+amount+time window
      let existingInvoice: any = null;

      const { data: descMatch } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', currentAppointment.patient_id)
        .eq('doctor_id', currentAppointment.doctor_id)
        .eq('status', 'paid')
        .ilike('description', `%Consultation with ${doctorName}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      existingInvoice = descMatch;

      // Fallback: check by patient + doctor + similar amount within last 5 minutes
      if (!existingInvoice) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentMatch } = await supabase
          .from('invoices')
          .select('*')
          .eq('patient_id', currentAppointment.patient_id)
          .eq('doctor_id', currentAppointment.doctor_id)
          .eq('status', 'paid')
          .gte('created_at', fiveMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        existingInvoice = recentMatch;
      }

      let invoiceData = existingInvoice;

      if (!invoiceData && !(currentAppointment.invoice_generated_at || appointment.invoice_generated_at || appointment.invoice)) {
        const { applyPatientDiscount } = await import('@/utils/discountUtils');
        let finalAmount = consultationFee;
        let discountNote = '';

        try {
          const discountResult = await applyPatientDiscount(currentAppointment.patient_id, consultationFee, 'consultation');
          if (discountResult.discountApplied > 0) {
            finalAmount = discountResult.discountedAmount;
            const discountInfo = discountResult.discountLabel || 'discount';
            discountNote = ` (${discountInfo}, Original: Rs. ${consultationFee})`;
          }
        } catch (discountError) {
          console.error('Error applying discount:', discountError);
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('invoices')
          .insert({
            patient_id: currentAppointment.patient_id,
            doctor_id: currentAppointment.doctor_id,
            amount: finalAmount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            invoice_number: `INV-${Date.now()}`,
            description: `${consultationDescriptionPattern}${discountNote}`,
            due_date: new Date().toISOString().split('T')[0],
            created_by: currentUser?.id || null
          })
          .select()
          .single();

        if (error) throw error;
        invoiceData = data;
      }

      if (!invoiceData) {
        toast({
          title: 'Invoice not found',
          description: 'This appointment is already marked paid, but no invoice record could be found.',
          variant: 'destructive',
        });
        return;
      }

      const invoiceGeneratedAt = currentAppointment.invoice_generated_at || invoiceData.paid_at || invoiceData.created_at || new Date().toISOString();

      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          invoice_generated_at: invoiceGeneratedAt,
        })
        .eq('id', currentAppointment.id);

      setAppointments((prev) => prev.map((item) =>
        item.id === currentAppointment.id
          ? {
              ...item,
              payment_status: 'paid',
              invoice_generated_at: invoiceGeneratedAt,
              invoice: {
                amount: invoiceData.amount,
                description: invoiceData.description,
              },
            }
          : item
      ));
      // Generate and open PDF
      const patientName = getPatientName(appointment.patient_id, patientNames || []);
      const doctorName = getDoctorName(appointment.doctor_id, doctorNames || []);
      
      // Create invoice object for PDF generation with complete patient information
      console.log('invoiceData from database:', JSON.stringify(invoiceData, null, 2));

      const invoiceDataWithoutPatient = invoiceData;
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
            first_name: (patientData?.profiles as any)?.first_name || patientName.split(' ')[0] || '',
            last_name: (patientData?.profiles as any)?.last_name || patientName.split(' ').slice(1).join(' ') || '',
            email: (patientData?.profiles as any)?.email || '',
            phone: (patientData?.profiles as any)?.phone || ''
          }
        }
      };

      console.log('Patient data for PDF:', { 
        patientData, 
        patient_number: patientData?.patient_number,
        profiles: patientData?.profiles,
        invoiceForPDF: invoiceForPDF.patient 
      });
      
      console.log('Final patient object being passed to PDF:', {
        patient_number: invoiceForPDF.patient.patient_number,
        users: invoiceForPDF.patient.users,
        emergency_contact_phone: invoiceForPDF.patient.emergency_contact_phone
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

  const handleReprintEmergencyInvoice = async (invoice: any) => {
    setProcessingInvoice(invoice.id);
    try {
      // Emergency invoices contain patient data in emergency_patient_data
      if (invoice.emergency_patient_data) {
        // Generate a proper emergency patient number from the invoice number
        const emergencyPatientNumber = invoice.invoice_number.replace('EMG-', 'E-');
        
        // Structure the emergency patient data properly for PDF generation
        const invoiceForPDF = {
          ...invoice,
          patient: {
            patient_number: emergencyPatientNumber,
            cnic: invoice.emergency_patient_data.cnic || '',
            address: '',
            date_of_birth: '',
            blood_type: '',
            allergies: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            users: {
              first_name: invoice.emergency_patient_data.name?.split(' ')[0] || '',
              last_name: invoice.emergency_patient_data.name?.split(' ').slice(1).join(' ') || '',
              email: '',
              phone: invoice.emergency_patient_data.phone || ''
            }
          }
        };
        
        await generateInvoicePDF(invoiceForPDF);
        
        toast({
          title: "Invoice Reprinted",
          description: "Emergency consultation invoice has been reprinted",
        });
      } else {
        toast({
          title: "Error",
          description: "Emergency patient data not found for this invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reprinting emergency invoice:', error);
      toast({
        title: "Error",
        description: "Failed to reprint emergency invoice",
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
                      <TableHead className="w-[80px]">Position</TableHead>
                      <TableHead className="w-[100px]">Patient ID</TableHead>
                      <TableHead className="w-[160px]">Patient Name</TableHead>
                      <TableHead className="w-[150px]">Doctor</TableHead>
                      <TableHead className="w-[120px]">People Ahead</TableHead>
                      <TableHead className="w-[110px]">Booking Type</TableHead>
                      <TableHead className="w-[130px]">Payment Status</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
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
                              {/* Check if appointment is marked as free by doctor */}
                              {appointment.cleared_at && (
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
                              {processingInvoice === appointment.id
                                ? 'Processing...'
                                : (appointment.invoice_generated_at || appointment.invoice)
                                  ? 'Reprint Invoice'
                                  : 'Generate Invoice'}
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
                        <TableHead className="w-[100px]">Time</TableHead>
                        <TableHead className="w-[140px]">Invoice Number</TableHead>
                        <TableHead className="w-[180px]">Patient Name</TableHead>
                        <TableHead className="w-[120px]">Amount</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleReprintEmergencyInvoice(invoice)}
                              disabled={processingInvoice === invoice.id}
                            >
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
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[100px]">Patient ID</TableHead>
                      <TableHead className="w-[160px]">Patient Name</TableHead>
                      <TableHead className="w-[150px]">Doctor</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[110px]">Booking Type</TableHead>
                      <TableHead className="w-[130px]">Payment Status</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
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
