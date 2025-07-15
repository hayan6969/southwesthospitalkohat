import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePatientAppointmentHistory, usePatientMedicalRecords, useCreateUpdateMedicalRecord, usePatientNotes, useCreatePatientNote, usePatientDocuments, usePatientLabReports } from "@/hooks/useDoctorData";
import { User, Calendar, FileText, Clock, Plus, Save, File, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPatientInfo } from "@/utils/patientUtils";

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
  const { data: patientDocuments, isLoading: documentsLoading } = usePatientDocuments(patient?.id);
  const { data: patientLabReports, isLoading: labReportsLoading } = usePatientLabReports(patient?.id);
  const createUpdateRecord = useCreateUpdateMedicalRecord();
  const createPatientNote = useCreatePatientNote();

  const patientProfile = patient?.profiles;
  
  // Format patient information using utility functions
  const patientInfo = formatPatientInfo(patient, patientProfile);

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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="labreports">Lab Reports</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses & Rx</TabsTrigger>
            <TabsTrigger value="notes">Patient Notes</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p className="text-lg">{patientInfo.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p>{patientInfo.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p>{patientInfo.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Patient Number</Label>
                  <p className="font-mono">{patientInfo.patientNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p>{patientInfo.dateOfBirth !== 'Not provided' ? format(new Date(patientInfo.dateOfBirth), 'MMM d, yyyy') : patientInfo.dateOfBirth}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Blood Type</Label>
                  <p>{patientInfo.bloodType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Allergies</Label>
                  <p>{patientInfo.allergies}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Emergency Contact</Label>
                  <p>{patientInfo.emergencyContact}</p>
                  {patientInfo.emergencyPhone !== patientInfo.phone && (
                    <p className="text-sm text-muted-foreground">{patientInfo.emergencyPhone}</p>
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

          <TabsContent value="labreports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Lab Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Date</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labReportsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : patientLabReports && patientLabReports.length > 0 ? (
                      patientLabReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            {report.test_date ? format(new Date(report.test_date), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>{report.test_name}</TableCell>
                          <TableCell>
                            {report.doctor?.profiles?.first_name && report.doctor?.profiles?.last_name 
                              ? `Dr. ${report.doctor.profiles.first_name} ${report.doctor.profiles.last_name}`
                              : report.external_doctor_name || 'External Doctor'
                            }
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.status === 'completed' ? 'bg-green-100 text-green-700' :
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {report.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {report.results ? (
                              <div className="max-w-xs truncate" title={report.results}>
                                {report.results}
                              </div>
                            ) : report.result_file_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(report.result_file_url, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View File
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Results pending</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No lab reports found for this patient
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

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  Patient Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="h-32 bg-gray-200 rounded animate-pulse mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : patientDocuments && patientDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patientDocuments.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {doc.file_type?.startsWith('image/') ? (
                            <img 
                              src={doc.file_url} 
                              alt={doc.document_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <File className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium truncate" title={doc.document_name}>
                            {doc.document_name}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate" title={doc.document_label}>
                            {doc.document_label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p>No documents found for this patient</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}