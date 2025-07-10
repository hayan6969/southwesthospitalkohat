
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { PatientDialog } from "@/components/dialogs/PatientDialog";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { useAppointments, usePatients, useDoctors } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, UserPlus, Receipt, Users, Clock, Edit, CreditCard, Printer, Search, FileText, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/pdfGenerator";

export function StaffCounter() {
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const [searchTerm, setSearchTerm] = useState("");
  const [processingInvoice, setProcessingInvoice] = useState<string | null>(null);

  // Get all appointments for today (including all statuses)
  const todayAppointments = useMemo(() => {
    if (!appointments) return [];
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointment_date).toISOString().split('T')[0];
      return appointmentDate === today;
    });
  }, [appointments]);

  // Get queue appointments (scheduled only)
  const queueAppointments = useMemo(() => {
    let filtered = todayAppointments.filter(apt => apt.status === 'scheduled');
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt => {
        const patientName = getPatientName(apt.patient_id, patientNames || []).toLowerCase();
        const doctorName = getDoctorName(apt.doctor_id, doctorNames || []).toLowerCase();
        const patientId = apt.patient_id.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return patientName.includes(search) || 
               doctorName.includes(search) || 
               patientId.includes(search);
      });
    }
    
    return filtered.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [todayAppointments, searchTerm, patientNames, doctorNames]);

  const handleGenerateInvoice = async (appointment: any) => {
    setProcessingInvoice(appointment.id);
    try {
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
      
      // Create invoice object for PDF generation
      const invoiceForPDF = {
        ...invoiceData,
        patient: {
          users: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: ''
          }
        }
      };

      // Generate and open PDF
      generateInvoicePDF(invoiceForPDF);
      
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueAppointments.length}</div>
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
              {todayAppointments.filter(apt => apt.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Today's appointments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <EnhancedAppointmentDialog />
        <PatientDialog />
        <InvoiceDialog />
        <Button variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Patient Card
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by patient name, patient ID, or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Patient Queue ({queueAppointments.length} appointments)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue #</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Time</TableHead>
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
                ) : queueAppointments.length > 0 ? (
                  queueAppointments.map((appointment, index) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-bold">#{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {appointment.patient_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {getPatientName(appointment.patient_id, patientNames || [])}
                      </TableCell>
                      <TableCell>
                        {getDoctorName(appointment.doctor_id, doctorNames || [])}
                      </TableCell>
                      <TableCell>
                        {format(new Date(appointment.appointment_date), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={appointment.booking_type === 'online' ? 'default' : 'secondary'}>
                          {appointment.booking_type || 'walk-in'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                          {appointment.payment_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {appointment.payment_status !== 'paid' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleGenerateInvoice(appointment)}
                              disabled={processingInvoice === appointment.id}
                            >
                              {processingInvoice === appointment.id ? (
                                <>
                                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3 mr-1" />
                                  Generate Invoice
                                </>
                              )}
                            </Button>
                          )}
                          {appointment.payment_status === 'paid' && (
                            <Badge variant="default" className="text-xs">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      {searchTerm ? 'No appointments found matching your search' : 'No patients in queue'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                        {todayAppointments.filter(apt => apt.doctor_id === doctor.id).length} appointments
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
