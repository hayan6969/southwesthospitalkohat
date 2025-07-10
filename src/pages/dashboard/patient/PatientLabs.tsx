
import AppLayout from "@/layouts/AppLayout";
import { useLabReports } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { Activity, User, Calendar, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function PatientLabs() {
  const { profile } = useAuth();
  const { data: labReports, isLoading } = useLabReports();

  const patientLabs = labReports?.filter(lab => lab.patient_id === profile?.id) || [];

  const handleDownloadResult = (resultFileUrl: string) => {
    window.open(resultFileUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Reports</h1>
          <p className="text-gray-600 mt-1">View your laboratory test results</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Test Results
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Date</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Ordered By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Actions</TableHead>
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
              ) : patientLabs.length > 0 ? (
                patientLabs.map((lab) => (
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
                      <span className="font-medium">{lab.test_name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            Dr. {lab.doctor?.profiles?.first_name} {lab.doctor?.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lab.doctor?.specialization}
                          </div>
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
                        {lab.results || 'Results pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         {lab.status === 'completed' && lab.result_file_url && (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleDownloadResult(lab.result_file_url!)}
                           >
                             <Download className="w-3 h-3 mr-1" />
                             Download Results
                           </Button>
                         )}
                        {lab.status === 'completed' && lab.results && !lab.result_file_url && (
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                        )}
                        {lab.status === 'pending' && (
                          <span className="text-sm text-gray-500">Results pending</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                    No lab reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
