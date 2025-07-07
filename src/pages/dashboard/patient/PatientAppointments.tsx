
import AppLayout from "@/layouts/AppLayout";
import { useAppointments } from "@/hooks/useAppointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";

export default function PatientAppointments() {
  const { data: appointments, isLoading } = useAppointments();

  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) > new Date()
  ) || [];

  const pastAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) <= new Date()
  ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">View and manage your appointments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
              <div className="text-2xl font-bold">{pastAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {upcomingAppointments.length > 0 ? 
                  format(new Date(upcomingAppointments[0].appointment_date), 'MMM d') : 
                  'None scheduled'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 3 }).map((_, j) => (
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
                            Dr. {appointment.doctor?.user?.first_name} {appointment.doctor?.user?.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{appointment.type}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                          No upcoming appointments
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAppointments.slice(0, 5).map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          Dr. {appointment.doctor?.user?.first_name} {appointment.doctor?.user?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
