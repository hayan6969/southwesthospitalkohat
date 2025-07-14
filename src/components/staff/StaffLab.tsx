
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  
  // Upload dialog state management
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<any>(null);
  const [selectedReportId, setSelectedReportId] = useState("");

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
    setPatientSearchTerm("");
    setSelectedPatientForUpload(null);
    setSelectedReportId("");
    setResultFile(null);
  };

  // Handle patient selection for upload
  const handlePatientSelect = (patient: any) => {
    setSelectedPatientForUpload(patient);
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
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Results
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Lab Results
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Patient Search & Selection */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Patient
                  </h3>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter patient ID (e.g., P-XXXX)..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchLoading && (
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    )}
                  </div>
                </div>

                {/* Patient Search Results */}
                {searchedPatients && searchedPatients.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">SEARCH RESULTS</h4>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      {searchedPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors ${
                            selectedPatientForUpload?.id === patient.id ? 'bg-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {patient.profile ? `${patient.profile.first_name} ${patient.profile.last_name}` : 'No name'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {patient.patient_number || 'Not assigned'}
                                </p>
                              </div>
                            </div>
                            {selectedPatientForUpload?.id === patient.id && (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {patientSearchTerm && searchedPatients && searchedPatients.length === 0 && !searchLoading && (
                  <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No patients found with ID "{patientSearchTerm}"</p>
                  </div>
                )}
              </div>

              {/* Right Column - Reports & Upload */}
              <div className="space-y-4">
                {selectedPatientForUpload ? (
                  <>
                    {/* Selected Patient Info */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Selected Patient
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>Name:</strong> {selectedPatientForUpload.profile ? `${selectedPatientForUpload.profile.first_name} ${selectedPatientForUpload.profile.last_name}` : 'No name'}</p>
                        <p><strong>ID:</strong> {selectedPatientForUpload.patient_number || 'Not assigned'}</p>
                      </div>
                    </div>

                    {/* Pending Reports */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        PENDING REPORTS ({selectedPatientPendingReports.length})
                      </h4>
                      {selectedPatientPendingReports.length > 0 ? (
                        <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                          {selectedPatientPendingReports.map((report) => (
                            <div
                              key={report.id}
                              className={`p-3 border-b last:border-b-0 hover:bg-orange-50 cursor-pointer transition-colors ${
                                selectedReportId === report.id ? 'bg-orange-100 border-orange-200' : ''
                              }`}
                              onClick={() => setSelectedReportId(report.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{report.test_name}</p>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    <div>Date: {format(new Date(report.test_date), 'MMM d, yyyy')}</div>
                                    <div>Doctor: {report.doctor_id ? getDoctorName(report.doctor_id, doctorNames || []) : report.external_doctor_name || 'Unknown'}</div>
                                  </div>
                                </div>
                                {selectedReportId === report.id && (
                                  <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                          <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No pending reports for this patient</p>
                        </div>
                      )}
                    </div>

                    {/* Upload Section */}
                    {selectedReportId && (
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Upload className="w-4 h-4 text-purple-600" />
                          Upload Result File
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Selected Test:</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedPatientPendingReports.find(r => r.id === selectedReportId)?.test_name}
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                            className="bg-white"
                          />
                          <p className="text-xs text-muted-foreground">
                            Supported: PDF, Images, Word documents
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Search and select a patient to view their pending reports</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={resetUploadDialog}>
                Cancel
              </Button>
              <Button
                onClick={() => uploadResultsMutation.mutate()}
                disabled={!selectedReportId || !resultFile || uploadResultsMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {uploadResultsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Results
                  </>
                )}
              </Button>
            </div>
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
