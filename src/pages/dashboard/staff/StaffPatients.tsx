import AppLayout from "@/layouts/AppLayout";
import { usePatients } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { PatientDialog } from "@/components/dialogs/PatientDialog";
import { PatientDetailDialog } from "@/components/dialogs/PatientDetailDialog";
import { Users, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useState } from "react";

export default function StaffPatients() {
  const { data: patients, isLoading } = usePatients();
  const { data: patientNames } = usePatientNames();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleViewPatient = (patient: any) => {
    // Combine patient data with profile data for the dialog
    const patientProfile = patientNames?.find(profile => profile.id === patient.id);
    const combinedPatient = {
      ...patient,
      profiles: patientProfile
    };
    setSelectedPatient(combinedPatient);
    setIsDetailDialogOpen(true);
  };

  const handleEditPatient = (patient: any) => {
    // Same as view for now - the PatientDetailDialog has edit capabilities
    handleViewPatient(patient);
  };

  const getRegistrationDate = (patient: any) => {
    // Get profile data to find registration date
    const profile = patientNames?.find(p => p.id === patient.id);
    if (profile?.created_at) {
      return format(new Date(profile.created_at), 'MMM d, yyyy');
    }
    return 'N/A';
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
            <p className="text-gray-600 mt-1">Register and manage patient information</p>
          </div>
          <PatientDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Patient Registry
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
                  <TableHead>Registration Date</TableHead>
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
                          {getPatientName(patient.id, patientNames || [])}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.patient_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{patient.emergency_contact_phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {patient.blood_type || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getRegistrationDate(patient)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewPatient(patient)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditPatient(patient)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
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

        {/* Patient Detail Dialog for viewing and editing */}
        <PatientDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          patient={selectedPatient}
        />
      </div>
    </AppLayout>
  );
}
