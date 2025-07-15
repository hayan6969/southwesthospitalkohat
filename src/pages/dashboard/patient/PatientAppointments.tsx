import AppLayout from "@/layouts/AppLayout";
import { useAppointments } from "@/hooks/useDatabase";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Calendar, Clock, User, Plus, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function PatientAppointments() {
  const { data: appointmentsData, isLoading, refetch: refetchAppointments } = useAppointments();
  const [appointments, setAppointments] = useState<any[]>([]);

  const currentPatientId = "550e8400-e29b-41d4-a716-446655440008"; // Current patient
  
  // Fetch appointments with invoice data to check for free status
  useEffect(() => {
    const fetchAppointmentsWithInvoices = async () => {
      if (!appointmentsData) return;
      
      const appointmentsWithInvoices = await Promise.all(
        appointmentsData.map(async (appointment) => {
          // Always try to find invoice for paid appointments
          if (appointment.payment_status === 'paid') {
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
    
    // Set up interval to refresh data every 10 seconds to catch real-time updates
    const interval = setInterval(fetchAppointmentsWithInvoices, 10000);
    
    return () => clearInterval(interval);
  }, [appointmentsData]);

  const patientAppointments = appointments?.filter(apt => apt.patient_id === currentPatientId) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-gray-600 mt-1">View and manage your upcoming appointments</p>
          </div>
          <AppointmentDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Appointments
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : patientAppointments.length > 0 ? (
                  patientAppointments.map((appointment) => (
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
                              Dr. {appointment.doctor?.profiles?.first_name} {appointment.doctor?.profiles?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.doctor?.specialization}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {appointment.type}
                        </span>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-2">
                           <span className={`px-2 py-1 rounded-full text-sm font-medium w-fit ${
                             appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                             appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                             appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                             'bg-gray-100 text-gray-700'
                           }`}>
                             {appointment.status}
                           </span>
                           {appointment.invoice?.amount === 0 || appointment.invoice?.description?.includes('Free') ? (
                             <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1 w-fit">
                               <Gift className="w-4 h-4 mr-2" />
                               Marked as Free
                             </Badge>
                           ) : null}
                         </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {appointment.notes || 'No notes'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
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
