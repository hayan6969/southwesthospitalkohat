import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { XrayDialog } from "@/components/dialogs/XrayDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Search, X, FileText } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import { generateXrayInvoicePDF } from "@/utils/pdfGenerator";
import { formatPatientInfo } from "@/utils/patientUtils";

export function StaffXray() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: xrayReports, isLoading, refetch } = useQuery({
    queryKey: ["xray-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xray_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch patient and doctor data separately
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .eq("role", "patient");
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "doctor");
      if (error) throw error;
      return data;
    },
  });

  const filteredReports = xrayReports?.filter((report) => {
    if (!searchTerm) return true;
    
    const patient = patients?.find(p => p.id === report.patient_id);
    const doctor = doctors?.find(d => d.id === report.doctor_id);
    
    const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase() : '';
    const doctorName = doctor ? `${doctor.first_name || ''} ${doctor.last_name || ''}`.toLowerCase() : '';
    const testName = report.test_name.toLowerCase();
    const phone = patient?.phone || '';
    
    return (
      patientName.includes(searchTerm.toLowerCase()) ||
      doctorName.includes(searchTerm.toLowerCase()) ||
      testName.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="border-blue-200 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadPDF = async (report: any) => {
    try {
      const patientProfile = patients?.find(p => p.id === report.patient_id);
      const doctorProfile = doctors?.find(d => d.id === report.doctor_id);
      
      const patientInfo = formatPatientInfo(
        { emergency_contact_phone: patientProfile?.phone }, 
        patientProfile
      );
      
      await generateXrayInvoicePDF({
        invoiceNumber: `XR-${report.id.slice(0, 8)}`,
        patientName: patientInfo.fullName,
        patientEmail: patientInfo.email,
        patientId: patientInfo.patientNumber,
        patientPhone: patientInfo.phone,
        doctorName: report.external_doctor_name || 
          (doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : undefined),
        tests: [{
          name: report.test_name,
          price: report.price || 0,
          description: report.notes || undefined
        }],
        totalAmount: report.price || 0,
        issueDate: new Date(report.created_at).toLocaleDateString(),
        xrayDate: new Date(report.xray_date).toLocaleDateString(),
        notes: report.notes
      });
    } catch (error) {
      console.error('Error generating X-ray PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">X-ray Management</h3>
          <p className="text-muted-foreground">Schedule and manage X-ray examinations</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          Schedule X-ray
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by patient, doctor, or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>X-ray Test</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No X-ray reports found matching your search." : "No X-ray reports found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredReports?.map((report) => {
                const patient = patients?.find(p => p.id === report.patient_id);
                const doctor = doctors?.find(d => d.id === report.doctor_id);
                
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {patient?.phone || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor ? (
                        `Dr. ${doctor.first_name} ${doctor.last_name}`
                      ) : (
                        <span className="text-muted-foreground">{report.external_doctor_name || "External"}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{report.test_name}</TableCell>
                    <TableCell>
                      {format(new Date(report.xray_date), "MMM dd, yyyy 'at' h:mm a")}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="font-medium">{formatPkrAmount(report.price)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {report.notes || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(report)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <XrayDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          refetch();
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}