
import AppLayout from "@/layouts/AppLayout";
import { useAppointments } from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function StaffAppointments() {
  const { data: appointments, isLoading } = useAppointments();

  const todayAppointments = appointments?.filter(apt => 
    apt.appointment_date.startsWith(new Date().toISOString().split('T')[0])
  ) || [];

  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) > new Date()
  ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointments Management</h1>
            <p className="text-gray-600 mt-1">Manage hospital appointments</p>
          </div>
          <AppointmentDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments?.filter(apt => apt.status === 'completed').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
          </CardHeader>
          <CardContent>
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
                          <div>
                            <p className="font-medium">
                              {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(appointment.appointment_date), 'h:mm a')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {appointment.patient?.user?.first_name} {appointment.patient?.user?.last_name}
                        </TableCell>
                        <TableCell>
                          Dr. {appointment.doctor?.user?.first_name} {appointment.doctor?.user?.last_name}
                        </TableCell>
                        <TableCell>{appointment.type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            appointment.status === 'completed' ? 'default' :
                            appointment.status === 'cancelled' ? 'destructive' :
                            'secondary'
                          }>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
