
import AppLayout from "@/layouts/AppLayout";
import { useAppointments, useUpdateAppointment } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { Calendar, Clock, User, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StaffAppointments() {
  const { data: appointments, isLoading } = useAppointments();
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {appointment.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {appointment.status}
                        </span>
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
                            </>
                          )}
                        </div>
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
