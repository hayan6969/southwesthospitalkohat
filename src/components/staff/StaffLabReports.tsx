import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, FileText, Download, Eye } from "lucide-react";
import { PdfViewerDialog } from "@/components/dialogs/PdfViewerDialog";

interface LabReport {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  test_name: string;
  results: string | null;
  notes: string | null;
  status: string;
  test_date: string;
  price: number;
  external_doctor_name: string | null;
  result_file_url: string | null;
  patient?: {
    profile: {
      first_name: string;
      last_name: string;
    };
    patient_number: string;
  };
  doctor?: {
    first_name: string;
    last_name: string;
  };
}

export function StaffLabReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { toast } = useToast();

  const searchLabReports = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a patient ID or patient number to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      const term = searchTerm.trim();
      let patients: any[] | null = null;

      // 1) Try by patient_number (e.g. P-00001 or partial like 00001)
      const { data: byNumber } = await supabase
        .from("patients")
        .select("id, patient_number, profile:profiles!patients_id_fkey(first_name, last_name, email)")
        .ilike("patient_number", `%${term}%`);

      if (byNumber && byNumber.length > 0) {
        patients = byNumber;
      }

      // 2) If not found, try by phone number via profile email pattern {phone}@patient.local
      if (!patients || patients.length === 0) {
        const { data: byPhone } = await supabase
          .from("patients")
          .select("id, patient_number, profile:profiles!patients_id_fkey(first_name, last_name, email)")
          .eq("profile.email", `${term}@patient.local`);

        // Filter out rows where profile didn't match (postgrest returns nulls)
        const matched = byPhone?.filter((p: any) => p.profile !== null) || [];
        if (matched.length > 0) {
          patients = matched;
        }
      }

      // 3) If still not found, try by UUID
      if (!patients || patients.length === 0) {
        if (term.includes("-") && term.length > 30) {
          const { data: byId } = await supabase
            .from("patients")
            .select("id, patient_number, profile:profiles!patients_id_fkey(first_name, last_name, email)")
            .eq("id", term);
          if (byId && byId.length > 0) {
            patients = byId;
          }
        }
      }

      if (!patients || patients.length === 0) {
        setLabReports([]);
        toast({
          title: "No Patient Found",
          description: "No patient found. Try searching by patient number (P-XXXXX) or phone number.",
          variant: "destructive",
        });
        return;
      }

      const patient = patients[0];

      // Now fetch lab reports for this patient
      const { data: reports, error: reportsError } = await supabase
        .from("lab_reports")
        .select(`
          *,
          patient:patients!inner(
            patient_number,
            profile:profiles!inner(first_name, last_name)
          )
        `)
        .eq("patient_id", patient.id)
        .order("test_date", { ascending: false });

      if (reportsError) {
        console.error("Error fetching lab reports:", reportsError);
        toast({
          title: "Fetch Error",
          description: "Failed to fetch lab reports",
          variant: "destructive",
        });
        return;
      }

      // Fetch doctor information for reports that have doctor_id
      let enrichedReports = reports;
      if (reports && reports.length > 0) {
        const doctorIds = reports
          .map(report => report.doctor_id)
          .filter(id => id) as string[];
        
        if (doctorIds.length > 0) {
          const { data: doctors } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", doctorIds);

          // Map doctor information to reports
          enrichedReports = reports.map(report => ({
            ...report,
            doctor: report.doctor_id && doctors 
              ? doctors.find(doc => doc.id === report.doctor_id)
              : null
          }));
        }
      }

      setLabReports((enrichedReports as any) || []);

      if (!reports || reports.length === 0) {
        toast({
          title: "No Lab Reports",
          description: `No lab reports found for patient ${patient.patient_number}`,
        });
      } else {
        toast({
          title: "Search Successful",
          description: `Found ${reports.length} lab report(s) for patient ${patient.patient_number}`,
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while searching",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchLabReports();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get public URL for PDF viewing from public bucket
  const getPdfUrl = async (result_file_url: string): Promise<string | null> => {
    if (!result_file_url) return null;
    
    console.log('Getting PDF URL for file:', result_file_url);
    
    // If it's already a full URL, return as is
    if (result_file_url.startsWith('http')) {
      console.log('Already a full URL:', result_file_url);
      return result_file_url;
    }
    
    try {
      // Since lab-results bucket is now public, we can use getPublicUrl directly
      const { data } = supabase.storage
        .from('lab-results')
        .getPublicUrl(result_file_url);
      
      if (data?.publicUrl) {
        console.log('Successfully got public URL for:', result_file_url, '-> URL:', data.publicUrl);
        // Add timestamp and disable cache to prevent Chrome blocking
        const urlWithParams = `${data.publicUrl}?t=${Date.now()}&cache=no`;
        console.log('Final URL with cache busting:', urlWithParams);
        return urlWithParams;
      }
      
      console.error('No public URL returned from Supabase');
      return null;
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      toast({
        title: "Error",
        description: "Failed to load PDF",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDownloadResult = async (resultFileUrl: string, testName: string) => {
    if (!resultFileUrl) {
      toast({
        title: "Error",
        description: "No file URL available",
        variant: "destructive",
      });
      return;
    }

    try {
      let downloadUrl = resultFileUrl;
      
      // If it's not already a full URL, get the public URL using the same method as getPdfUrl
      if (!resultFileUrl.startsWith('http')) {
        const { data } = supabase.storage
          .from('lab-results')
          .getPublicUrl(resultFileUrl);
        
        if (data?.publicUrl) {
          downloadUrl = data.publicUrl;
          console.log('Successfully got public URL for download:', resultFileUrl, '-> URL:', downloadUrl);
        } else {
          throw new Error('Failed to get public URL');
        }
      }

      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${testName}-result.pdf`;
      link.target = '_blank';
      
      // Force download by setting the download attribute
      link.setAttribute('download', `${testName}-result.pdf`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${testName} lab result`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the lab result file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lab Reports Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Patient Number (P-XXXXX) or Phone Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={searchLabReports} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Search by patient number (e.g., P-00001) or phone number
          </p>
        </CardContent>
      </Card>

      {searchPerformed && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Reports Results</CardTitle>
          </CardHeader>
          <CardContent>
            {labReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No lab reports found for the searched patient.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Found {labReports.length} lab report(s) for patient: {" "}
                  <span className="font-medium">
                    {labReports[0]?.patient?.profile?.first_name} {labReports[0]?.patient?.profile?.last_name} 
                    ({labReports[0]?.patient?.patient_number})
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Test Date</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.test_name}</TableCell>
                          <TableCell>
                            {format(new Date(report.test_date), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {report.doctor ? 
                              `Dr. ${report.doctor.first_name} ${report.doctor.last_name}` :
                              report.external_doctor_name || "N/A"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>Rs. {report.price?.toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={report.results || "No results yet"}>
                              {report.results || "Pending"}
                            </div>
                            {report.notes && (
                              <div className="text-xs text-muted-foreground truncate" title={report.notes}>
                                Notes: {report.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {report.result_file_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const pdfUrl = await getPdfUrl(report.result_file_url!);
                                  if (pdfUrl) {
                                    window.open(pdfUrl, '_blank');
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                No PDF
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}