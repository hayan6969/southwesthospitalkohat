import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, User, Building2, Clock, FileText, Search, ChevronLeft, ChevronRight, Activity, Banknote, LogOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPkrAmount } from "@/utils/currency";
import { TreatmentChartDialog } from "@/components/ipd/TreatmentChartDialog";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";

interface IPDAdmissionWithDetails {
  id: string;
  admission_number: string;
  patient_id: string;
  doctor_id: string;
  bed_id: string;
  ward_id: string;
  source: string;
  status: string;
  admission_date: string;
  discharge_date: string | null;
  chief_complaint: string;
  provisional_diagnosis: string;
  final_diagnosis: string;
  notes: string;
  beds: { bed_number: string };
  wards: { name: string };
}

export default function DoctorIPD() {
  const { profile } = useAuth();
  const { data: patientNames } = usePatientNames();
  const [admissions, setAdmissions] = useState<IPDAdmissionWithDetails[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [chartFor, setChartFor] = useState<IPDAdmissionWithDetails | null>(null);
  const [invoiceData, setInvoiceData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchDoctorIPDAdmissions();
  }, [profile?.id]);

  const fetchDoctorIPDAdmissions = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      let allAdmissions: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("ipd_admissions")
          .select("*, beds(bed_number), wards(name)")
          .eq("doctor_id", profile.id)
          .range(start, start + batchSize - 1)
          .order("admission_date", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          allAdmissions = [...allAdmissions, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setAdmissions(allAdmissions || []);

      // Fetch invoice data for payment status check
      const admIds = (allAdmissions || []).map(a => a.id);
      if (admIds.length > 0) {
        const { data: invData } = await supabase
          .from("ipd_invoices")
          .select("admission_id, total_amount, paid_amount, status, finalized_at")
          .in("admission_id", admIds);
        const invMap: Record<string, any> = {};
        (invData ?? []).forEach((inv: any) => { invMap[inv.admission_id] = inv; });
        setInvoiceData(invMap);
      }

      // Calculate total IPD earnings for this doctor
      const dischargedIds = (allAdmissions || [])
        .filter(a => a.status === "discharged")
        .map(a => a.id);

      if (dischargedIds.length > 0) {
        const { data: charges } = await supabase
          .from("ipd_charges")
          .select("amount")
          .in("admission_id", dischargedIds)
          .eq("charge_type", "doctor");

        const earned = (charges || []).reduce((sum, c) => sum + Number(c.amount), 0);
        setTotalEarnings(earned);
      }
    } catch (error) {
      console.error("Error fetching IPD admissions:", error);
      toast.error("Failed to load IPD admissions");
    } finally {
      setLoading(false);
    }
  };

  const activeAdmissions = admissions.filter(a => a.status === "admitted");
  const dischargedAdmissions = admissions.filter(a => a.status === "discharged");

  const filteredDischarged = useMemo(() => {
    let filtered = dischargedAdmissions;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.admission_number.toLowerCase().includes(term) ||
        getPatientName(a.patient_id, patientNames || []).toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [dischargedAdmissions, searchTerm, patientNames]);

  const paginatedDischarged = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDischarged.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDischarged, currentPage]);

  const totalPages = Math.ceil(filteredDischarged.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleChart = (admission: IPDAdmissionWithDetails) => {
    setChartFor(admission);
  };

  const handleDischarge = async (admission: IPDAdmissionWithDetails) => {
    const inv = invoiceData[admission.id];
    if (!inv || !inv.finalized_at) {
      toast.error("Cannot discharge — bill has not been finalized by staff");
      return;
    }
    if (Number(inv.paid_amount) < Number(inv.total_amount)) {
      toast.error("Cannot discharge — bill payment is not complete");
      return;
    }
    if (!confirm(`Discharge ${getPatientName(admission.patient_id, patientNames || [])}?`)) return;
    try {
      const { error } = await supabase.from("ipd_admissions").update({
        status: "discharged",
        discharge_date: new Date().toISOString(),
      }).eq("id", admission.id);
      if (error) throw error;
      toast.success("Patient discharged");
      fetchDoctorIPDAdmissions();
    } catch (e: any) {
      toast.error(e.message || "Failed to discharge");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPD Admissions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admissions.length}</div>
            <p className="text-xs text-muted-foreground">All time admissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admissions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAdmissions.length}</div>
            <p className="text-xs text-muted-foreground">Currently admitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discharged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dischargedAdmissions.length}</div>
            <p className="text-xs text-muted-foreground">Discharged patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPD Earnings</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">From discharged patients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            IPD Admissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Admissions ({activeAdmissions.length})</TabsTrigger>
              <TabsTrigger value="discharged">Discharged ({dischargedAdmissions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {activeAdmissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Ward / Bed</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Admitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeAdmissions.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.admission_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {getPatientName(a.patient_id, patientNames || [])}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {a.wards?.name} / Bed {a.beds?.bed_number}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {a.provisional_diagnosis || a.chief_complaint || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {format(new Date(a.admission_date), "MMM d, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleChart(a)}
                                className="flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Treatment Chart
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDischarge(a)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <LogOut className="w-3 h-3" />
                                Discharge
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No active IPD admissions found
                </div>
              )}
            </TabsContent>

            <TabsContent value="discharged" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 max-w-md">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by admission # or patient name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : paginatedDischarged.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Admission #</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Ward / Bed</TableHead>
                            <TableHead>Diagnosis</TableHead>
                            <TableHead>Admitted</TableHead>
                            <TableHead>Discharged</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDischarged.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-mono text-xs">{a.admission_number}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">
                                    {getPatientName(a.patient_id, patientNames || [])}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {a.wards?.name} / Bed {a.beds?.bed_number}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {a.final_diagnosis || a.provisional_diagnosis || a.chief_complaint || "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(a.admission_date), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-xs">
                                {a.discharge_date
                                  ? format(new Date(a.discharge_date), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChart(a)}
                                  className="flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  View Chart
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDischarged.length)} to {Math.min(currentPage * itemsPerPage, filteredDischarged.length)} of {filteredDischarged.length} discharged
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              const start = Math.max(1, currentPage - 2);
                              const end = Math.min(totalPages, currentPage + 2);
                              return page >= start && page <= end;
                            })
                            .map(page => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    {searchTerm
                      ? `No discharged patients found matching "${searchTerm}"`
                      : "No discharged IPD patients found"
                    }
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {chartFor && (
        <TreatmentChartDialog
          open={!!chartFor}
          onOpenChange={(o) => !o && setChartFor(null)}
          admissionId={chartFor.id}
          patientName={getPatientName(chartFor.patient_id, patientNames || [])}
          admissionNumber={chartFor.admission_number}
        />
      )}
    </div>
  );
}
