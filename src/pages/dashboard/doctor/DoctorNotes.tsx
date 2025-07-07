
import AppLayout from "@/layouts/AppLayout";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function DoctorNotes() {
  const { data: medicalRecords, isLoading } = useMedicalRecords();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Notes</h1>
            <p className="text-gray-600 mt-1">Patient medical records and notes</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search medical records..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : medicalRecords && medicalRecords.length > 0 ? (
            medicalRecords.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      <span>
                        {record.patient?.user?.first_name} {record.patient?.user?.last_name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {record.visit_date ? format(new Date(record.visit_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {record.diagnosis && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Diagnosis</h4>
                        <p className="text-sm text-gray-600">{record.diagnosis}</p>
                      </div>
                    )}
                    
                    {record.treatment && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Treatment</h4>
                        <p className="text-sm text-gray-600">{record.treatment}</p>
                      </div>
                    )}
                    
                    {record.prescription && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Prescription</h4>
                        <p className="text-sm text-gray-600">{record.prescription}</p>
                      </div>
                    )}
                    
                    {record.notes && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700">Notes</h4>
                        <p className="text-sm text-gray-600">{record.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No medical records</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new medical record.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
