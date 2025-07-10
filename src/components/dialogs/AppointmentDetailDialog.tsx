import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePatientNotes, usePatientMedicalRecords, usePatientAppointmentHistory } from "@/hooks/useDoctorData";
import { Calendar, Clock, User, FileText, Stethoscope } from "lucide-react";
import { format } from "date-fns";

interface AppointmentDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  patientName: string;
}

export function AppointmentDetailDialog({ 
  isOpen, 
  onClose, 
  appointment, 
  patientName 
}: AppointmentDetailDialogProps) {
  const { data: patientNotes, isLoading: notesLoading } = usePatientNotes(appointment?.patient_id);
  const { data: medicalRecords, isLoading: recordsLoading } = usePatientMedicalRecords(appointment?.patient_id);
  const { data: appointmentHistory, isLoading: historyLoading } = usePatientAppointmentHistory(appointment?.patient_id);

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Appointment Details - {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium">
                  {format(new Date(appointment.appointment_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{appointment.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                  {appointment.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payment</p>
                <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                  {appointment.payment_status || 'pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="records" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Medical Records
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {notesLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : patientNotes && patientNotes.length > 0 ? (
                    <div className="space-y-3">
                      {patientNotes.map((note) => (
                        <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="text-sm text-muted-foreground mb-1">
                            {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                          <p className="text-sm">{note.notes}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No notes found for this patient.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {recordsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : medicalRecords && medicalRecords.length > 0 ? (
                    <div className="space-y-4">
                      {medicalRecords.map((record) => (
                        <div key={record.id} className="border rounded-lg p-4">
                          <div className="text-sm text-muted-foreground mb-2">
                            {format(new Date(record.visit_date), 'MMM d, yyyy')}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium">Diagnosis</p>
                              <p className="text-sm">{record.diagnosis || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Treatment</p>
                              <p className="text-sm">{record.treatment || 'N/A'}</p>
                            </div>
                          </div>
                          {record.prescription && (
                            <div className="mt-2">
                              <p className="font-medium">Prescription</p>
                              <p className="text-sm">{record.prescription}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div className="mt-2">
                              <p className="font-medium">Notes</p>
                              <p className="text-sm">{record.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No medical records found for this patient.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appointment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : appointmentHistory && appointmentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {appointmentHistory.map((appt) => (
                        <div key={appt.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium">
                              {format(new Date(appt.appointment_date), 'MMM d, yyyy h:mm a')}
                            </p>
                            <p className="text-sm text-muted-foreground">{appt.type}</p>
                          </div>
                          <Badge variant={appt.status === 'completed' ? 'default' : 'secondary'}>
                            {appt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No appointment history found for this patient.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}