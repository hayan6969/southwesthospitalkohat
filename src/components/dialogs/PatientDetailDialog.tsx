import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePatientAppointmentHistory, usePatientMedicalRecords, useCreateUpdateMedicalRecord, usePatientNotes, useCreatePatientNote } from "@/hooks/useDoctorData";
import { User, Calendar, FileText, Clock, Plus, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PatientDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
}

export function PatientDetailDialog({ isOpen, onClose, patient }: PatientDetailDialogProps) {
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [recordForm, setRecordForm] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });

  const { data: appointmentHistory, isLoading: historyLoading } = usePatientAppointmentHistory(patient?.id);
  const { data: medicalRecords, isLoading: recordsLoading } = usePatientMedicalRecords(patient?.id);
  const { data: patientNotes, isLoading: notesLoading } = usePatientNotes(patient?.id);
  const createUpdateRecord = useCreateUpdateMedicalRecord();
  const createPatientNote = useCreatePatientNote();

  const patientProfile = patient?.profiles;

  const handleSaveRecord = async () => {
    try {
      await createUpdateRecord.mutateAsync({
        id: activeRecord?.id,
        patient_id: patient.id,
        ...recordForm
      });
      
      toast.success(activeRecord ? 'Record updated successfully' : 'Record created successfully');
      setActiveRecord(null);
      setIsCreatingRecord(false);
      setRecordForm({ diagnosis: '', treatment: '', prescription: '', notes: '' });
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save diagnostic record');
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await createPatientNote.mutateAsync({
        patient_id: patient.id,
        notes: newNote
      });
      
      toast.success('Note added successfully');
      setNewNote('');
      setIsCreatingNote(false);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const handleEditRecord = (record: any) => {
    setActiveRecord(record);
    setRecordForm({
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescription: record.prescription || '',
      notes: record.notes || ''
    });
    setIsCreatingRecord(true);
  };

  const handleNewRecord = () => {
    setActiveRecord(null);
    setRecordForm({ diagnosis: '', treatment: '', prescription: '', notes: '' });
    setIsCreatingRecord(true);
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {patientProfile?.first_name} {patientProfile?.last_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses & Rx</TabsTrigger>
            <TabsTrigger value="notes">Patient Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p className="text-lg">{patientProfile?.first_name} {patientProfile?.last_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p>{patientProfile?.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p>{patientProfile?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Patient Number</Label>
                  <p className="font-mono">{patient.patient_number || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p>{patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Blood Type</Label>
                  <p>{patient.blood_type || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Allergies</Label>
                  <p>{patient.allergies || 'None reported'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Emergency Contact</Label>
                  <p>{patient.emergency_contact_name || 'Not provided'}</p>
                  {patient.emergency_contact_phone && (
                    <p className="text-sm text-muted-foreground">{patient.emergency_contact_phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Appointment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : appointmentHistory && appointmentHistory.length > 0 ? (
                      appointmentHistory.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(appointment.appointment_date), 'h:mm a')}
                          </TableCell>
                          <TableCell>{appointment.type}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {appointment.status}
                            </span>
                          </TableCell>
                          <TableCell>{appointment.notes || 'No notes'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No appointment history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Medical Records & Prescriptions
                  </span>
                  <Button onClick={handleNewRecord} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Record
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCreatingRecord ? (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium">
                      {activeRecord ? 'Edit Medical Record' : 'Create New Medical Record'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="diagnosis">Diagnosis</Label>
                        <Input
                          id="diagnosis"
                          value={recordForm.diagnosis}
                          onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="treatment">Treatment</Label>
                        <Input
                          id="treatment"
                          value={recordForm.treatment}
                          onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="prescription">Prescription</Label>
                      <Textarea
                        id="prescription"
                        value={recordForm.prescription}
                        onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={recordForm.notes}
                        onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveRecord} disabled={createUpdateRecord.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {createUpdateRecord.isPending ? 'Saving...' : 'Save Record'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCreatingRecord(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Prescription</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : medicalRecords && medicalRecords.length > 0 ? (
                      medicalRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.visit_date ? format(new Date(record.visit_date), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>{record.diagnosis || 'No diagnosis'}</TableCell>
                          <TableCell>{record.treatment || 'No treatment'}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.prescription || 'No prescription'}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleEditRecord(record)}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No medical records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Patient Notes
                  </span>
                  <Button onClick={() => setIsCreatingNote(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCreatingNote && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-4">
                    <h4 className="font-medium">Add New Note</h4>
                    <div>
                      <Label htmlFor="new-note">Note</Label>
                      <Textarea
                        id="new-note"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Enter your note for this patient..."
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveNote} disabled={createPatientNote.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {createPatientNote.isPending ? 'Saving...' : 'Save Note'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsCreatingNote(false);
                        setNewNote('');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {notesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))
                  ) : patientNotes && patientNotes.length > 0 ? (
                    patientNotes.map((note) => (
                      <div key={note.id} className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Clock className="w-4 h-4" />
                          {note.visit_date ? format(new Date(note.visit_date), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                        </div>
                        <p className="whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No notes found for this patient
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}