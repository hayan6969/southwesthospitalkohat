
import AppLayout from "@/layouts/AppLayout";
import { useAppointments, useUpdateAppointment } from "@/hooks/useDatabase";
import { Calendar, Clock, User, Edit3, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DoctorSchedule() {
  const { data: appointments, isLoading } = useAppointments();
  const updateAppointment = useUpdateAppointment();

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

  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) >= new Date() || apt.status === 'scheduled'
  ).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-gray-600 mt-1">Manage your appointments and availability</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              Set Availability
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
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
                ) : upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => (
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
                              {appointment.patient?.users?.first_name} {appointment.patient?.users?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.patient?.users?.email}
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
                        <span className="text-sm text-gray-600">
                          {appointment.notes || 'No notes'}
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
                          <Button size="sm" variant="ghost">
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                      No upcoming appointments scheduled
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
