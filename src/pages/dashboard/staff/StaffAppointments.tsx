
import AppLayout from "@/layouts/AppLayout";
import { useAppointments, useUpdateAppointment } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { Calendar, Clock, User, CheckCircle, X, CreditCard, AlertTriangle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ReferToIPDDialog } from "@/components/ipd/ReferToIPDDialog";

export default function StaffAppointments() {
  const { data: appointmentsData, isLoading } = useAppointments();
  
  // Fetch appointments with invoice data to check for free status
  const [appointments, setAppointments] = useState<any[]>([]);
  
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
  const updateAppointment = useUpdateAppointment();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointmentId,
        status: newStatus as any,
        updated_at: new Date().toISOString()
      });
      toast.success(`Appointment ${newStatus} successfully`);
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  };

  const handleGenerateInvoice = async (appointment: any) => {
    try {
      // Create an invoice record
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      // Get patient and doctor details for invoice
      const { data: patientData } = await supabase
        .from('patients')
        .select('*, profiles(*)')
        .eq('id', appointment.patient_id)
        .single();

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('*, profiles(*)')
        .eq('id', appointment.doctor_id)
        .single();

      // Update appointment payment status
      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          invoice_generated_at: new Date().toISOString(),
          payment_due_time: null
        })
        .eq('id', appointment.id);

      // Generate PDF invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString(),
        patient: {
          users: {
            first_name: (patientData?.profiles as any)?.first_name || '',
            last_name: (patientData?.profiles as any)?.last_name || '',
            email: (patientData?.profiles as any)?.email || ''
          }
        },
        description: `${appointment.type} consultation with Dr. ${(doctorData?.profiles as any)?.first_name || ''} ${(doctorData?.profiles as any)?.last_name || ''}`,
        amount: doctorData?.consultation_fee || 2000, // Default fee if not set
        status: 'paid'
      };

      await generateInvoicePDF(invoiceData);
      toast.success('Invoice generated and payment confirmed');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
            <p className="text-gray-600 mt-1">Schedule and manage patient appointments</p>
          </div>
          <EnhancedAppointmentDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Appointments
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : appointments && appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {getPatientName(appointment.patient_id, patientNames || [])}
                            </div>
                            <div className="text-sm text-gray-500">
                              Patient ID: {appointment.patient_id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {getDoctorName(appointment.doctor_id, doctorNames || [])}
                          </div>
                          <div className="text-sm text-gray-500">
                            Doctor ID: {appointment.doctor_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {appointment.type}
                        </Badge>
                      </TableCell>
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
                          {appointment.invoice?.amount === 0 || appointment.invoice?.description?.includes('Free') ? (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs ml-1">
                              <Gift className="w-3 h-3 mr-1" />
                              Free
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {appointment.status === 'scheduled' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                disabled={updateAppointment.isPending}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                disabled={updateAppointment.isPending}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                              {appointment.booking_type === 'online' && appointment.payment_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleGenerateInvoice(appointment)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Generate Invoice
                                </Button>
                              )}
                              <ReferToIPDDialog
                                patientId={appointment.patient_id}
                                doctorId={appointment.doctor_id}
                                appointmentId={appointment.id}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      No appointments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
