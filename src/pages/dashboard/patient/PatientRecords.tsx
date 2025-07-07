
import AppLayout from "@/layouts/AppLayout";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User, Pill } from "lucide-react";
import { format } from "date-fns";

export default function PatientRecords() {
  const { data: medicalRecords, isLoading } = useMedicalRecords();

  const recentRecords = medicalRecords?.slice(0, 5) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Medical Records</h1>
          <p className="text-gray-600 mt-1">View your medical history and records</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicalRecords?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentRecords.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doctors Seen</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(medicalRecords?.map(r => r.doctor_id)).size || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {medicalRecords?.filter(r => r.prescription).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Prescription</TableHead>
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
                  ) : medicalRecords && medicalRecords.length > 0 ? (
                    medicalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {record.visit_date && format(new Date(record.visit_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          Dr. {record.doctor?.user?.first_name} {record.doctor?.user?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.diagnosis || 'Not specified'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.treatment || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.prescription || '-'}
                        </TableCell>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
