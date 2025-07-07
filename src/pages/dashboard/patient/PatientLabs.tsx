
import AppLayout from "@/layouts/AppLayout";
import { useLabReports } from "@/hooks/useLabReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestTube, Calendar, FileText, Download } from "lucide-react";
import { format } from "date-fns";

export default function PatientLabs() {
  const { data: labReports, isLoading } = useLabReports();

  const pendingReports = labReports?.filter(report => report.status === 'pending') || [];
  const completedReports = labReports?.filter(report => report.status === 'completed') || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Lab Reports</h1>
          <p className="text-gray-600 mt-1">View your laboratory test results</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReports.length}</div>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lab Report History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
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
                          {report.test_date && format(new Date(report.test_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          Dr. {report.doctor?.user?.first_name} {report.doctor?.user?.last_name}
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
                          {report.status === 'completed' && (
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </TableCell>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
