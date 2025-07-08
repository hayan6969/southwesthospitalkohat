
import AppLayout from "@/layouts/AppLayout";
import { useMedicalRecords } from "@/hooks/useDatabase";
import { FileText, User, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function PatientRecords() {
  const { data: medicalRecords, isLoading } = useMedicalRecords();

  const currentPatientId = "550e8400-e29b-41d4-a716-446655440008"; // Current patient
  const patientRecords = medicalRecords?.filter(record => record.patient_id === currentPatientId) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600 mt-1">View your complete medical history</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Medical History
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Prescription</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : patientRecords.length > 0 ? (
                  patientRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {format(new Date(record.visit_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                        <div className="font-medium">
                          Dr. {record.doctor?.profiles?.first_name} {record.doctor?.profiles?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.doctor?.specialization}
                        </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.diagnosis || 'No diagnosis recorded'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.treatment || 'No treatment recorded'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.prescription || 'No prescription'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {record.notes || 'No additional notes'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                      No medical records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
