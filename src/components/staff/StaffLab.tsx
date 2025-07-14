
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLabReports } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName, useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { TestTube, Upload, Clock, CheckCircle, FileText, Search, User, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EnhancedLabDialog } from "@/components/dialogs/EnhancedLabDialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function StaffLab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  
  // Upload dialog state management
  const [uploadStep, setUploadStep] = useState<'search' | 'reports' | 'upload'>('search');
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<any>(null);

  const { data: labReports, isLoading } = useLabReports();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const queryClient = useQueryClient();

  // Patient search for upload dialog
  const { data: searchedPatients, isLoading: searchLoading } = useSearchPatientsWithNames(patientSearchTerm);

  // Get pending reports for selected patient in upload dialog
  const selectedPatientPendingReports = selectedPatientForUpload 
    ? labReports?.filter(r => r.patient_id === selectedPatientForUpload.id && r.status === 'pending') || []
    : [];

  // Reset upload dialog state when closing
  const resetUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadStep('search');
    setPatientSearchTerm("");
    setSelectedPatientForUpload(null);
    setSelectedReportId("");
    setResultFile(null);
  };

  // Handle patient selection for upload
  const handlePatientSelect = (patient: any) => {
    setSelectedPatientForUpload(patient);
    setUploadStep('reports');
  };

  // Handle back navigation in upload dialog
  const handleBackToSearch = () => {
    setUploadStep('search');
    setSelectedPatientForUpload(null);
    setSelectedReportId("");
    setResultFile(null);
  };

  // Handle report selection for upload
  const handleReportSelect = (reportId: string) => {
    setSelectedReportId(reportId);
    setUploadStep('upload');
  };

  const pendingReports = labReports?.filter(report => report.status === 'pending') || [];
  const completedReports = labReports?.filter(report => report.status === 'completed') || [];

  // Filter reports by search query
  const filteredReports = pendingReports.filter(report => {
    const patientName = getPatientName(report.patient_id, patientNames || []).toLowerCase();
    const doctorName = getDoctorName(report.doctor_id, doctorNames || []).toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return patientName.includes(query) || 
           doctorName.includes(query) || 
           report.test_name.toLowerCase().includes(query) ||
           report.patient_id.toLowerCase().includes(query);
  });

  // Get unique patients from pending reports
  const uniquePatients = Array.from(new Set(pendingReports.map(r => r.patient_id)))
    .map(patientId => ({
      id: patientId,
      name: getPatientName(patientId, patientNames || [])
    }));

  // Get pending reports for selected patient
  const patientReports = selectedPatientId 
    ? pendingReports.filter(r => r.patient_id === selectedPatientId)
    : [];

  // Upload results mutation
  const uploadResultsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReportId || !resultFile) {
        throw new Error("Missing report ID or file");
      }

      // Upload file to storage
      const fileExt = resultFile.name.split('.').pop();
      const fileName = `lab-results/${selectedReportId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lab-results')
        .upload(fileName, resultFile);

      if (uploadError) throw uploadError;

      // Store the file path instead of public URL since bucket is private
      const filePath = fileName;

      // Update lab report
      const { error: updateError } = await supabase
        .from('lab_reports')
        .update({
          status: 'completed',
          result_file_url: filePath,
          results: 'Results uploaded - see attached file'
        })
        .eq('id', selectedReportId);

      if (updateError) throw updateError;

      return { filePath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      toast.success("Lab results uploaded and marked as completed");
      resetUploadDialog();
    },
    onError: (error) => {
      toast.error("Failed to upload results");
      console.error("Upload error:", error);
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedReports.filter(report => 
                report.test_date.startsWith(new Date().toISOString().split('T')[0])
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Reports completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labReports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Time</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15 min</div>
            <p className="text-xs text-muted-foreground">Average wait</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <EnhancedLabDialog />
        
        <Dialog open={uploadDialogOpen} onOpenChange={resetUploadDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              onClick={() => {
                console.log("Upload Results button clicked!");
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Results
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {uploadStep === 'reports' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToSearch}
                    className="p-1 h-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                {uploadStep === 'upload' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setUploadStep('reports')}
                    className="p-1 h-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                Upload Lab Results
                {uploadStep === 'search' && " - Search Patient"}
                {uploadStep === 'reports' && " - Select Report"}
                {uploadStep === 'upload' && " - Upload File"}
              </DialogTitle>
            </DialogHeader>

            {/* Step 1: Search Patient */}
            {uploadStep === 'search' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-search">Search Patient by ID (e.g., P-0003)</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="patient-search"
                      placeholder="Enter patient ID like P-0003..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {searchLoading && (
                    <p className="text-sm text-muted-foreground mt-1">Searching...</p>
                  )}
                </div>

                {searchedPatients && searchedPatients.length > 0 && (
                  <div className="space-y-2">
                    <Label>Search Results</Label>
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      {searchedPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {patient.profile ? `${patient.profile.first_name} ${patient.profile.last_name}` : 'No name available'}
                                </p>
                                <div className="text-sm text-muted-foreground">
                                  <div><strong>Patient ID:</strong> {patient.patient_number || 'Not assigned'}</div>
                                  <div><strong>Phone:</strong> {patient.profile?.phone || 'Not provided'}</div>
                                  <div><strong>CNIC:</strong> {patient.cnic || 'Not provided'}</div>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {patientSearchTerm && searchedPatients && searchedPatients.length === 0 && !searchLoading && (
                  <div className="text-center py-4 text-muted-foreground">
                    No patients found with ID "{patientSearchTerm}"
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={resetUploadDialog}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Show Patient's Pending Reports */}
            {uploadStep === 'reports' && selectedPatientForUpload && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Selected Patient</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {selectedPatientForUpload.profile ? `${selectedPatientForUpload.profile.first_name} ${selectedPatientForUpload.profile.last_name}` : 'No name available'}</div>
                    <div><strong>Patient ID:</strong> {selectedPatientForUpload.patient_number || 'Not assigned'}</div>
                  </div>
                </div>

                <div>
                  <Label>Pending Lab Reports ({selectedPatientPendingReports.length} reports)</Label>
                  {selectedPatientPendingReports.length > 0 ? (
                    <div className="border rounded-lg mt-2 max-h-64 overflow-y-auto">
                      {selectedPatientPendingReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleReportSelect(report.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{report.test_name}</p>
                              <div className="text-sm text-muted-foreground">
                                <div><strong>Test Date:</strong> {format(new Date(report.test_date), 'MMM d, yyyy')}</div>
                                <div><strong>Doctor:</strong> {report.doctor_id ? getDoctorName(report.doctor_id, doctorNames || []) : report.external_doctor_name || 'Unknown'}</div>
                                {report.notes && <div><strong>Notes:</strong> {report.notes}</div>}
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Upload
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending lab reports found for this patient
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={resetUploadDialog}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Upload File */}
            {uploadStep === 'upload' && selectedReportId && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Upload Results For</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Patient:</strong> {selectedPatientForUpload?.profile ? `${selectedPatientForUpload.profile.first_name} ${selectedPatientForUpload.profile.last_name}` : 'No name available'}</div>
                    <div><strong>Patient ID:</strong> {selectedPatientForUpload?.patient_number || 'Not assigned'}</div>
                    <div><strong>Test:</strong> {selectedPatientPendingReports.find(r => r.id === selectedReportId)?.test_name}</div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="result-file">Upload Result File</Label>
                  <Input
                    id="result-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Accepted formats: PDF, Images, Word documents
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetUploadDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => uploadResultsMutation.mutate()}
                    disabled={!resultFile || uploadResultsMutation.isPending}
                  >
                    {uploadResultsMutation.isPending ? "Uploading..." : "Upload Results"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Lab Queue
            </CardTitle>
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {getPatientName(report.patient_id, patientNames || [])}
                        </TableCell>
                        <TableCell>{report.test_name}</TableCell>
                        <TableCell>
                          {getDoctorName(report.doctor_id, doctorNames || [])}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.test_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            {report.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        {searchQuery ? "No lab reports match your search" : "No pending lab reports"}
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
              <CheckCircle className="w-5 h-5" />
              Recent Completed Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedReports.slice(0, 5).map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium">
                      {getPatientName(report.patient_id, patientNames || [])}
                    </p>
                    <p className="text-sm text-gray-600">{report.test_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">Completed</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(report.test_date), 'MMM d')}
                    </p>
                  </div>
                </div>
              ))}
              {completedReports.length === 0 && (
                <p className="text-gray-500 text-center py-4">No completed reports</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
