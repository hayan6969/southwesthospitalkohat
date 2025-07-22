import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, FileText, Filter, Calendar, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPkrAmount } from "@/utils/currency";
import { PdfViewerDialog } from "@/components/dialogs/PdfViewerDialog";

interface Patient {
  id: string;
  patient_number: string;
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface LabReport {
  id: string;
  patient_id: string;
  test_date: string;
  test_name: string;
  price: number;
  status: string;
  results: string;
  notes: string;
  result_file_url: string;
  external_doctor_name: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function PharmacyLabReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patientSearch, setPatientSearch] = useState(searchParams.get('patient') || "");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [testNameFilter, setTestNameFilter] = useState("");

  // Search for patients
  const searchPatients = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingPatients(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          patient_number,
          profiles!patients_id_fkey(
            first_name,
            last_name,
            phone
          )
        `)
        .or(`patient_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching patients:", error);
      toast.error("Failed to search patients");
    } finally {
      setSearchingPatients(false);
    }
  };

  // Fetch lab reports for selected patient
  const fetchLabReports = async (patientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          id,
          patient_id,
          test_date,
          test_name,
          price,
          status,
          results,
          notes,
          result_file_url,
          external_doctor_name,
          patients!lab_reports_patient_id_fkey(
            patient_number,
            profiles!patients_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('test_date', { ascending: false });

      if (error) throw error;
      setLabReports(data || []);
      setFilteredReports(data || []);
    } catch (error) {
      console.error("Error fetching lab reports:", error);
      toast.error("Failed to fetch lab reports");
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on filters
  useEffect(() => {
    let filtered = labReports;

    if (dateFilter) {
      filtered = filtered.filter(report => 
        new Date(report.test_date).toDateString() === new Date(dateFilter).toDateString()
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (testNameFilter.trim()) {
      filtered = filtered.filter(report => 
        report.test_name.toLowerCase().includes(testNameFilter.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [labReports, dateFilter, statusFilter, testNameFilter]);

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setPatientSearch(patient.patient_number);
    setSearchParams({ patient: patient.patient_number });
    fetchLabReports(patient.id);
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setPatientSearch(value);
    if (!value.trim()) {
      setSelectedPatient(null);
      setLabReports([]);
      setFilteredReports([]);
      setSearchResults([]);
      setSearchParams({});
    } else {
      searchPatients(value);
    }
  };

  // Handle viewing PDF report
  const handleViewReport = (report: LabReport) => {
    if (!report.result_file_url) {
      toast.error("No PDF file available for this report");
      return false;
    }
    return true;
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFilter("");
    setStatusFilter("all");
    setTestNameFilter("");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Reports</h1>
          <p className="text-gray-600 mt-1">View patient lab reports and download PDFs</p>
        </div>

        {/* Patient Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Label htmlFor="patient-search">Enter Patient ID (e.g., P-0001)</Label>
              <Input
                id="patient-search"
                type="text"
                placeholder="Search by Patient ID..."
                value={patientSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="mt-1"
              />
              
              {searchingPatients && (
                <div className="absolute right-3 top-9 animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className="p-2 bg-gray-50 border-b font-medium">Search Results</div>
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div>
                      <div className="font-medium">{patient.patient_number}</div>
                      <div className="text-sm text-gray-600">
                        {patient.profiles?.first_name} {patient.profiles?.last_name}
                      </div>
                      {patient.profiles?.phone && (
                        <div className="text-xs text-gray-500">{patient.profiles.phone}</div>
                      )}
                    </div>
                    <Button size="sm" variant="outline">Select</Button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Patient */}
            {selectedPatient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">
                      {selectedPatient.patient_number} - {selectedPatient.profiles?.first_name} {selectedPatient.profiles?.last_name}
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedPatient.profiles?.phone}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lab Reports Section */}
        {selectedPatient && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Lab Reports ({filteredReports.length})
                </div>
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="date-filter">Filter by Date</Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="test-filter">Filter by Test Name</Label>
                  <Input
                    id="test-filter"
                    type="text"
                    placeholder="Search test name..."
                    value={testNameFilter}
                    onChange={(e) => setTestNameFilter(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reports Table */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
                  <p>Loading lab reports...</p>
                </div>
              ) : filteredReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Date</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                              <div>{new Date(report.test_date).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(report.test_date).toLocaleDateString('en-US', { weekday: 'long' })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{report.test_name}</div>
                          {report.notes && (
                            <div className="text-sm text-gray-600 mt-1">{report.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>{formatPkrAmount(report.price)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === 'completed' ? 'default' : 'secondary'}
                            className={report.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.external_doctor_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {report.result_file_url ? (
                            <PdfViewerDialog
                              pdfUrl={report.result_file_url}
                              title={`${report.test_name} - ${new Date(report.test_date).toLocaleDateString()}`}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View PDF
                                </Button>
                              }
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
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
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No lab reports found</p>
                  <p className="text-sm">
                    {labReports.length === 0 
                      ? "This patient has no completed lab reports"
                      : "No reports match the current filters"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}