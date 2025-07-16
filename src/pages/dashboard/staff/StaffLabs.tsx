import AppLayout from "@/layouts/AppLayout";
import { useLabReports, useUpdateLabReport } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { LabDialog } from "@/components/dialogs/LabDialog";
import { Activity, User, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StaffLabs() {
  const { data: labReports, isLoading } = useLabReports();
  const { data: patientNames } = usePatientNames();
  const updateLabReport = useUpdateLabReport();

  const handleMarkComplete = async (labId: string) => {
    try {
      await updateLabReport.mutateAsync({
        id: labId,
        status: 'completed',
        results: 'Results processed by lab staff'
      });
      toast.success('Lab report marked as completed');
    } catch (error) {
      toast.error('Failed to update lab report');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lab Management</h1>
            <p className="text-gray-600 mt-1">Process and manage laboratory reports</p>
          </div>
          <LabDialog />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              All Lab Reports
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Ordered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : labReports && labReports.length > 0 ? (
                  labReports.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {format(new Date(lab.test_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              {lab.patient?.patient_number || 'No ID'}
                            </div>
                            <div className="font-medium">
                              {getPatientName(lab.patient_id, patientNames || [])}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{lab.test_name}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            Dr. {lab.doctor?.profiles?.first_name} {lab.doctor?.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lab.doctor?.specialization}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          lab.status === 'completed' ? 'bg-green-100 text-green-700' :
                          lab.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {lab.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {lab.results || 'Pending processing'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lab.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkComplete(lab.id)}
                              disabled={updateLabReport.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      No lab reports found
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
