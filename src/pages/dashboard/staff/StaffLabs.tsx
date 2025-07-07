
import AppLayout from "@/layouts/AppLayout";
import { useLabReports } from "@/hooks/useLabReports";
import { LabDialog } from "@/components/dialogs/LabDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestTube, Calendar, FileText, Edit, Upload } from "lucide-react";
import { format } from "date-fns";

export default function StaffLabs() {
  const { data: labReports, isLoading } = useLabReports();

  const pendingReports = labReports?.filter(report => report.status === 'pending') || [];
  const completedReports = labReports?.filter(report => report.status === 'completed') || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lab Reports Management</h1>
            <p className="text-gray-600 mt-1">Manage laboratory tests and reports</p>
          </div>
          <LabDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{labReports?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReports.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReports.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Tests</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {labReports?.filter(report => 
                  report.test_date?.startsWith(new Date().toISOString().split('T')[0])
                ).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Lab Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Test Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : labReports && labReports.length > 0 ? (
                    labReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.test_name}
                        </TableCell>
                        <TableCell>
                          {report.patient?.user?.first_name} {report.patient?.user?.last_name}
                        </TableCell>
                        <TableCell>
                          Dr. {report.doctor?.user?.first_name} {report.doctor?.user?.last_name}
                        </TableCell>
                        <TableCell>
                          {report.test_date && format(new Date(report.test_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            report.status === 'completed' ? 'default' :
                            report.status === 'reviewed' ? 'secondary' :
                            'outline'
                          }>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {report.status === 'pending' && (
                              <Button size="sm" variant="outline">
                                <Upload className="w-3 h-3 mr-1" />
                                Upload Results
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No lab reports found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
