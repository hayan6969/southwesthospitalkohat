import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { FileText, TestTube, User, Upload, ArrowLeft, Calendar, Pill } from "lucide-react";
import { format } from "date-fns";

interface PatientDetailsViewProps {
  patientId: string;
  patientName: string;
  onBack: () => void;
}

export function PatientDetailsView({ patientId, patientName, onBack }: PatientDetailsViewProps) {
  const [patientData, setPatientData] = useState<any>(null);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      setLoading(true);
      try {
        // Fetch patient profile and details
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', patientId)
          .single();

        const { data: patientDetails } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        // Fetch lab reports
        const { data: labData } = await supabase
          .from('lab_reports')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        // Fetch medical records
        const { data: recordsData } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        // Fetch appointments
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });

        setPatientData({ ...profileData, ...patientDetails });
        setLabReports(labData || []);
        setMedicalRecords(recordsData || []);
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('Error fetching patient details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetails();
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
            <p className="text-gray-600">Patient Details & Medical History</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General Info</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="labs">Lab Reports</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
              <CardDescription>
                General patient details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg font-medium">{patientData?.first_name} {patientData?.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{patientData?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{patientData?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient Number</label>
                  <p className="font-mono">{patientData?.patient_number || 'Not assigned'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p>{patientData?.date_of_birth ? format(new Date(patientData.date_of_birth), 'MMM d, yyyy') : 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Blood Type</label>
                  <p>{patientData?.blood_type || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Allergies</label>
                  <p>{patientData?.allergies || 'None reported'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                  <p>{patientData?.emergency_contact_name || 'Not provided'}</p>
                  {patientData?.emergency_contact_phone && (
                    <p className="text-sm text-gray-600">{patientData.emergency_contact_phone}</p>
                  )}
                </div>
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
              <CardDescription>
                Patient appointment history and visit timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length > 0 ? (
                    appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(appointment.appointment_date), 'h:mm a')}
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
                        <TableCell>{appointment.notes || 'No notes'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Lab Reports
              </CardTitle>
              <CardDescription>
                Patient laboratory test results and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labReports.length > 0 ? (
                    labReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.test_name}</TableCell>
                        <TableCell>
                          {report.test_date ? format(new Date(report.test_date), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.status === 'completed' ? 'bg-green-100 text-green-700' :
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {report.status}
                          </span>
                        </TableCell>
                        <TableCell>{report.results || 'Pending'}</TableCell>
                        <TableCell>{report.notes || 'No notes'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No lab reports found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Medical Records
              </CardTitle>
              <CardDescription>
                Patient visit history and medical notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Prescription</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicalRecords.length > 0 ? (
                    medicalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {record.visit_date ? format(new Date(record.visit_date), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">{record.diagnosis || 'No diagnosis'}</TableCell>
                        <TableCell>{record.treatment || 'No treatment'}</TableCell>
                        <TableCell>{record.prescription || 'No prescription'}</TableCell>
                        <TableCell>{record.notes || 'No notes'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No medical records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Documents & Uploads
              </CardTitle>
              <CardDescription>
                Patient uploaded documents and files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Document Management</p>
                <p>Document upload and management feature coming soon.</p>
                <Button className="mt-4" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}