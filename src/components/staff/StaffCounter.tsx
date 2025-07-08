
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { PatientDialog } from "@/components/dialogs/PatientDialog";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { useAppointments, usePatients, useDoctors } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { Calendar, UserPlus, Receipt, Users, Clock, Edit, CreditCard, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function StaffCounter() {
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();

  const todayAppointments = appointments?.filter(apt => 
    apt.appointment_date.startsWith(new Date().toISOString().split('T')[0])
  ) || [];

  const queueAppointments = todayAppointments
    .filter(apt => apt.status === 'scheduled')
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Patient Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueAppointments.length > 0 ? (
                    queueAppointments.map((appointment, index) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell>
                          {getPatientName(appointment.patient_id, patientNames || [])}
                        </TableCell>
                        <TableCell>
                          {getDoctorName(appointment.doctor_id, doctorNames || [])}
                        </TableCell>
                        <TableCell>
                          {format(new Date(appointment.appointment_date), 'h:mm a')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No patients in queue
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
