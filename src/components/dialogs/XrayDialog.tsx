import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Search, X, CalendarIcon } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import { generateXrayInvoicePDF } from "@/utils/pdfGenerator";
import { XrayOrderConfirmationDialog } from "./XrayOrderConfirmationDialog";

import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Custom hooks for patient and doctor names
const usePatientNames = () => {
  return useQuery({
    queryKey: ["patient-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "patient");
      if (error) throw error;
      return data.map(patient => ({
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`
      }));
    },
  });
};


interface XrayTest {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

interface XrayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function XrayDialog({ open, onOpenChange, onSuccess }: XrayDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctorName, setDoctorName] = useState("");
  
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [xrayDate, setXrayDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);
  
  const { logCreate } = useAuditLogger();
  const { user } = useAuth();

  // Fetch X-ray tests
  const { data: xrayTests, isLoading: testsLoading } = useQuery({
    queryKey: ["xray-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xray_tests")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });


  // Set today as default X-ray date when dialog opens
  useEffect(() => {
    if (open && !xrayDate) {
      setXrayDate(new Date());
    }
  }, [open]);

  const createXrayReport = useMutation({
    mutationFn: async (reportData: any) => {
      const { data, error } = await supabase
        .from("xray_reports")
        .insert(reportData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xray-reports"] });
    },
  });

  const handleTestToggle = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const resetForm = () => {
    setSearchTerm("");
    setSelectedPatient(null);
    setDoctorName("");
    setSelectedTests([]);
    setXrayDate(undefined);
    setNotes("");
    setShowConfirmation(false);
    setConfirmationData(null);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  const totalAmount = xrayTests
    ?.filter(test => selectedTests.includes(test.id))
    .reduce((sum, test) => sum + test.price, 0) || 0;

  const handleSubmit = async () => {
    if (selectedTests.length === 0) {
      toast.error("Please select at least one X-ray test");
      return;
    }

    if (!xrayDate) {
      toast.error("Please select an X-ray date");
      return;
    }

    if (!selectedPatient?.id) {
      toast.error("Please select a patient");
      return;
    }

    // Prepare confirmation data
    const patientData = selectedPatient;

    
    const patientName = patientData?.profile?.first_name && patientData?.profile?.last_name
      ? `${patientData.profile.first_name} ${patientData.profile.last_name}`.trim()
      : "Unknown Patient";

    const testsData = selectedTests.map(testId => {
      const test = xrayTests?.find(t => t.id === testId);
      return test ? {
        id: test.id,
        name: test.name,
        price: test.price,
        description: test.description,
        category: test.category
      } : null;
    }).filter(Boolean) as any[];

    const confirmationData = {
      patient: {
        name: patientName,
        phone: patientData?.profile?.phone || "N/A"
      },
      doctorName: doctorName.trim() || "Not specified",
      selectedTests: testsData,
      totalAmount,
      xrayDate: format(xrayDate, "MMM dd, yyyy"),
      notes: notes.trim()
    };

    setConfirmationData(confirmationData);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const patientId = selectedPatient?.id;
      
      // Create X-ray reports for each selected test
      const createdReports = [];
      for (const testId of selectedTests) {
        const test = xrayTests?.find(t => t.id === testId);
        if (!test) continue;

        const xrayData = {
          patient_id: patientId,
          test_id: testId,
          test_name: test.name,
          price: test.price,
          xray_date: xrayDate?.toISOString(),
          notes,
          status: 'pending'
        };

        const report = await createXrayReport.mutateAsync(xrayData);
        createdReports.push(report);
        
        // Log the X-ray creation
        const patientName = selectedPatient?.profile?.first_name && selectedPatient?.profile?.last_name
          ? `${selectedPatient.profile.first_name} ${selectedPatient.profile.last_name}`.trim()
          : "Unknown Patient";
            
        logCreate(
          'X-ray Report', 
          `X-ray scheduled: ${test.name} for patient ${patientName} (${formatPkrAmount(test.price)})`,
          user?.id
        );
      }

      // Generate and open PDF invoice
      if (createdReports.length > 0) {
        
        const patientName = selectedPatient?.profile?.first_name && selectedPatient?.profile?.last_name
          ? `${selectedPatient.profile.first_name} ${selectedPatient.profile.last_name}`.trim()
          : "Unknown Patient";

        const patientPhone = selectedPatient?.profile?.phone || "N/A";

        const testsForPDF = selectedTests.map(testId => {
          const test = xrayTests?.find(t => t.id === testId);
          return test ? {
            name: test.name,
            price: test.price,
            description: test.description || undefined
          } : null;
        }).filter(Boolean) as any[];

        await generateXrayInvoicePDF({
          invoiceNumber: `XR-${createdReports[0].id.slice(0, 8)}`,
          patientName: patientName,
          patientEmail: "N/A",
          patientId: selectedPatient?.patient_number || "N/A",
          patientPhone: patientPhone,
          doctorName: doctorName.trim() || undefined,
          tests: testsForPDF,
          totalAmount: totalAmount,
          issueDate: new Date().toLocaleDateString(),
          xrayDate: xrayDate ? format(xrayDate, "MMM dd, yyyy") : new Date().toLocaleDateString(),
          notes: notes.trim()
        });
      }

      toast.success(`${selectedTests.length} X-ray examination(s) scheduled successfully`);
      resetForm();
      setShowConfirmation(false);
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating X-ray reports:", error);
      toast.error("Failed to schedule X-ray examinations");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule X-ray Examination</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Patient</Label>
                <Input
                  id="search"
                  placeholder="Search by name, phone, or patient number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {selectedPatient ? (
                <div className="space-y-2">
                  <Label>Selected Patient</Label>
                  <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg text-gray-900">
                        {selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}
                      </div>
                      <div className="text-sm text-gray-600 space-y-0.5">
                        <div><strong>Patient ID:</strong> {selectedPatient.patient_number || 'N/A'}</div>
                        {selectedPatient.profile?.phone && <div><strong>Phone:</strong> {selectedPatient.profile.phone}</div>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : searchTerm ? (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No patients found matching your search.
                      </div>
                    )}
                    {searchResults?.map((patient) => {
                      const fullName = patient.profile?.first_name && patient.profile?.last_name
                        ? `${patient.profile.first_name} ${patient.profile.last_name}`.trim()
                        : 'Name not available';
                      return (
                        <div
                          key={patient.id}
                          className="p-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer transition-all duration-200"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <div className="font-semibold text-lg text-gray-900">{fullName}</div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div><strong>Patient ID:</strong> {patient.patient_number || 'Not assigned'}</div>
                            {patient.profile?.phone && <div><strong>Phone:</strong> {patient.profile.phone}</div>}
                            {patient.profile?.email && <div><strong>Email:</strong> {patient.profile.email}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
          </div>

          <Separator />

          <div className="space-y-4">
            {/* Doctor Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name (Optional)</Label>
              <Input
                id="doctorName"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Enter referring doctor's name..."
              />
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>X-ray Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !xrayDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {xrayDate ? format(xrayDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={xrayDate}
                    onSelect={setXrayDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* X-ray Tests Selection */}
            <div className="space-y-2">
              <Label>Available X-ray Tests *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search X-ray tests..."
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {testSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestSearchTerm("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                {xrayTests
                  ?.filter(test => {
                    if (!testSearchTerm) return true;
                    const term = testSearchTerm.toLowerCase();
                    return (
                      test.name.toLowerCase().includes(term) ||
                      test.category?.toLowerCase().includes(term) ||
                      test.description?.toLowerCase().includes(term)
                    );
                  })
                  .map((test) => (
                  <div key={test.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={`test-${test.id}`}
                      checked={selectedTests.includes(test.id)}
                      onCheckedChange={() => handleTestToggle(test.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`test-${test.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {test.name}
                      </label>
                      {test.category && (
                        <Badge variant="secondary" className="text-xs">{test.category}</Badge>
                      )}
                      {test.description && (
                        <p className="text-xs text-muted-foreground">{test.description}</p>
                      )}
                      <p className="text-sm font-semibold">{formatPkrAmount(test.price)}</p>
                    </div>
                  </div>
                ))}
                {xrayTests?.filter(test => {
                  if (!testSearchTerm) return true;
                  const term = testSearchTerm.toLowerCase();
                  return test.name.toLowerCase().includes(term) || test.category?.toLowerCase().includes(term) || test.description?.toLowerCase().includes(term);
                }).length === 0 && (
                  <div className="col-span-2 text-center py-4 text-muted-foreground">
                    No X-ray tests found matching "{testSearchTerm}"
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedPatient && (
              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span className="font-medium">
                      {selectedPatient 
                        ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`.trim()
                        : "Not selected"
                      }
                    </span>
                  </div>
                  {doctorName.trim() && (
                    <div className="flex justify-between">
                      <span>Doctor:</span>
                      <span className="font-medium">{doctorName.trim()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>X-ray Date:</span>
                    <span className="font-medium">{xrayDate ? format(xrayDate, "MMM dd, yyyy") : "Not selected"}</span>
                  </div>
                  
                  {/* Selected Tests with Individual Costs */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Selected Tests:</span>
                      <span className="font-medium">{selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''}</span>
                    </div>
                    {selectedTests.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {selectedTests.map(testId => {
                          const test = xrayTests?.find(t => t.id === testId);
                          return test ? (
                            <div key={test.id} className="flex justify-between items-center text-sm">
                              <div className="flex-1">
                                <span className="text-muted-foreground">• {test.name}</span>
                                {test.category && (
                                  <span className="text-xs text-muted-foreground ml-2">({test.category})</span>
                                )}
                              </div>
                              <span className="font-medium ml-2">
                                {formatPkrAmount(test.price)}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formatPkrAmount(totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={
                  testsLoading || 
                  selectedTests.length === 0 || 
                  !xrayDate || 
                  !selectedPatient
                }
              >
                Continue to Confirmation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {confirmationData && (
        <XrayOrderConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          confirmationData={confirmationData}
          onConfirm={handleConfirm}
          isProcessing={isSubmitting}
        />
      )}
    </>
  );
}