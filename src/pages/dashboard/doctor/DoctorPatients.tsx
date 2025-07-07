import AppLayout from "@/layouts/AppLayout";
import { usePatients, useCreateMedicalRecord } from "@/hooks/useDatabase";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Users, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DoctorPatients() {
  const { data: patients, isLoading } = usePatients();
  const createMedicalRecord = useCreateMedicalRecord();

  const handleAddRecord = async (patientId: string) => {
    try {
      await createMedicalRecord.mutateAsync({
        patient_id: patientId,
        doctor_id: '550e8400-e29b-41d4-a716-446655440001', // Current doctor ID
        visit_date: new Date().toISOString(),
        diagnosis: 'New consultation',
        treatment: 'To be determined',
        notes: 'Initial assessment needed'
      });
      toast.success('Medical record created');
    } catch (error) {
      toast.error('Failed to create medical record');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Patients</h1>
            <p className="text-gray-600 mt-1">View and manage your assigned patients</p>
          </div>
          <AppointmentDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Patient List
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Last Visit</TableHead>
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
                ) : patients && patients.length > 0 ? (
                  patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="font-medium">
                          {patient.users?.first_name} {patient.users?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.users?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{patient.users?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {patient.blood_type || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">No records</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAddRecord(patient.id)}
                            disabled={createMedicalRecord.isPending}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Add Record
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                      No patients found
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
