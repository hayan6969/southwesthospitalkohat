
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLabReports } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { TestTube, Upload, Clock, CheckCircle, FileText, Search } from "lucide-react";
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

  const { data: labReports, isLoading } = useLabReports();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const queryClient = useQueryClient();

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
      setUploadDialogOpen(false);
      setResultFile(null);
      setSelectedReportId("");
      setSelectedPatientId("");
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
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Results
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Lab Results</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="search-patient">Search Patient</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-patient"
                    placeholder="Search by patient name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="patient-select">Select Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient with pending reports" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePatients
                      .filter(patient => 
                        searchQuery === '' || 
                        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        patient.id.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {patientReports.length > 0 && (
                <div>
                  <Label htmlFor="report-select">Select Lab Report</Label>
                  <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose pending lab report" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientReports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.test_name} - {format(new Date(report.test_date), 'MMM d, yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedReportId && (
                <div>
                  <Label htmlFor="result-file">Upload Result File</Label>
                  <Input
                    id="result-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Accepted formats: PDF, Images, Word documents
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => uploadResultsMutation.mutate()}
                  disabled={!selectedReportId || !resultFile || uploadResultsMutation.isPending}
                >
                  {uploadResultsMutation.isPending ? "Uploading..." : "Upload Results"}
                </Button>
              </div>
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
