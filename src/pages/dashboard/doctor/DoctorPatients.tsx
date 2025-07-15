import { useState } from "react";
import { useDoctorPatients } from "@/hooks/useDoctorData";
import { PatientDetailDialog } from "@/components/dialogs/PatientDetailDialog";
import { Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function DoctorPatients() {
  const { data: patients, isLoading } = useDoctorPatients();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewPatient = (patient: any) => {
    setSelectedPatient(patient);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedPatient(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Patients</h1>
          <p className="text-gray-600 mt-1">View and manage your assigned patients</p>
        </div>
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
                        {patient.profiles?.first_name} {patient.profiles?.last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>{patient.profiles?.phone || patient.emergency_contact_phone || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {patient.blood_type || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">Patient History</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewPatient(patient)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
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

      <PatientDetailDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        patient={selectedPatient}
      />
    </div>
  );
}
