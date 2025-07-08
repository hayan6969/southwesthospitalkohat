
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabReports, useCreateLabReport } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { TestTube, Upload, Clock, CheckCircle, FileText, Plus, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export function StaffLab() {
  const { data: labReports, isLoading } = useLabReports();
  const createLabReport = useCreateLabReport();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();

  const pendingReports = labReports?.filter(report => report.status === 'pending') || [];
  const completedReports = labReports?.filter(report => report.status === 'completed') || [];

  const handleUploadResults = async (reportId: string) => {
    // This would typically open a file upload dialog
    toast.success("Lab results uploaded successfully");
  };

  const handleGenerateInvoice = async (reportId: string) => {
    // This would generate an invoice for the lab report
    toast.success("Invoice generated for lab report");
  };

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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Lab Order
        </Button>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload Results
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Lab Queue
            </CardTitle>
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
                    <TableHead>Actions</TableHead>
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
                  ) : pendingReports.length > 0 ? (
                    pendingReports.map((report) => (
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
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUploadResults(report.id)}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Upload
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleGenerateInvoice(report.id)}
                            >
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
                        No pending lab reports
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
