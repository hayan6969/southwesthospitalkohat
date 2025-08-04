import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Search, UserPlus, X, CalendarIcon } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import { XrayOrderConfirmationDialog } from "./XrayOrderConfirmationDialog";
import { useCreatePatientWithProfile } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
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

const useDoctorNames = () => {
  return useQuery({
    queryKey: ["doctor-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "doctor");
      if (error) throw error;
      return data.map(doctor => ({
        id: doctor.id,
        name: `Dr. ${doctor.first_name} ${doctor.last_name}`
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
  const [activeTab, setActiveTab] = useState("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // New patient registration
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    cnic: "",
    date_of_birth: "",
    address: "",
    blood_type: "",
    allergies: ""
  });
  
  const [doctorId, setDoctorId] = useState("");
  const [externalDoctorName, setExternalDoctorName] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [xrayDate, setXrayDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const createPatientWithProfile = useCreatePatientWithProfile();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);

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

  // Fetch doctors
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
    setNewPatient({
      first_name: "",
      last_name: "",
      phone: "",
      cnic: "",
      date_of_birth: "",
      address: "",
      blood_type: "",
      allergies: ""
    });
    setDoctorId("");
    setExternalDoctorName("");
    setSelectedTests([]);
    setXrayDate(undefined);
    setNotes("");
    setActiveTab("search");
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

    let patientId = selectedPatient?.id;
    
    // If registering new patient, create them first
    if (activeTab === "register") {
      if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()) {
        toast.error("Please fill in all required patient information");
        return;
      }

      try {
        const newPatientData = await createPatientWithProfile.mutateAsync({
          first_name: newPatient.first_name.trim(),
          last_name: newPatient.last_name.trim(),
          phone: newPatient.phone.trim(),
          cnic: newPatient.cnic.trim(),
        });

        if (newPatientData && newPatientData.patient) {
          patientId = newPatientData.patient.id;
        } else {
          toast.error("Failed to register patient");
          return;
        }
      } catch (error) {
        toast.error("Failed to register patient");
        console.error("Error creating patient:", error);
        return;
      }
    }

    if (!patientId) {
      toast.error("Please select or register a patient");
      return;
    }

    // Prepare confirmation data
    const patientData = activeTab === "register" ? {
      id: patientId,
      first_name: newPatient.first_name,
      last_name: newPatient.last_name,
      phone: newPatient.phone,
      patient_number: 'New Patient'
    } : selectedPatient;

    const selectedDoctor = doctors?.find(d => d.id === doctorId);
    const doctorName = externalDoctorName || (selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : "External Doctor");
    
    const patientName = patientData ? `${patientData.first_name} ${patientData.last_name}` : "Unknown Patient";

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
        phone: patientData?.phone || "N/A"
      },
      doctorName,
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
      let patientId = selectedPatient?.id;
      
      // If registering new patient, create them first
      if (activeTab === "register") {
        const newPatientData = await createPatientWithProfile.mutateAsync({
          first_name: newPatient.first_name.trim(),
          last_name: newPatient.last_name.trim(),
          phone: newPatient.phone.trim(),
          cnic: newPatient.cnic.trim(),
        });

        if (newPatientData && newPatientData.patient) {
          patientId = newPatientData.patient.id;
        } else {
          throw new Error("Failed to create patient");
        }
      }
      
      // Create X-ray reports for each selected test
      for (const testId of selectedTests) {
        const test = xrayTests?.find(t => t.id === testId);
        if (!test) continue;

        const xrayData = {
          patient_id: patientId,
          doctor_id: doctorId || null,
          external_doctor_name: externalDoctorName || null,
          test_id: testId,
          test_name: test.name,
          price: test.price,
          xray_date: xrayDate?.toISOString(),
          notes,
          status: 'pending'
        };

        await createXrayReport.mutateAsync(xrayData);
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Patient
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Register New Patient
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
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

              {searchTerm && (
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
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedPatient?.id === patient.id 
                              ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-lg text-gray-900">
                              {fullName}
                            </div>
                            {selectedPatient?.id === patient.id && (
                              <div className="text-blue-600 text-sm font-medium flex items-center gap-1">
                                <span className="text-blue-500">✓</span> Selected
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div><strong>Patient ID:</strong> {patient.patient_number || 'Not assigned'}</div>
                            {patient.profile?.phone && (
                              <div><strong>Phone:</strong> {patient.profile.phone}</div>
                            )}
                            {patient.profile?.email && (
                              <div><strong>Email:</strong> {patient.profile.email}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newPatient.first_name}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newPatient.last_name}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="03001234567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnic">CNIC *</Label>
                  <Input
                    id="cnic"
                    value={newPatient.cnic}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, cnic: e.target.value }))}
                    placeholder="12345-6789012-3"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={newPatient.date_of_birth}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Blood Type</Label>
                  <Select value={newPatient.blood_type} onValueChange={(value) => setNewPatient(prev => ({ ...prev, blood_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Patient address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="Any known allergies"
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-4">
            {/* Doctor Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a doctor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors?.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external-doctor">External Doctor Name</Label>
                <Input
                  id="external-doctor"
                  value={externalDoctorName}
                  onChange={(e) => setExternalDoctorName(e.target.value)}
                  placeholder="Enter external doctor name"
                  disabled={!!doctorId}
                />
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                {xrayTests?.map((test) => (
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
                      {test.description && (
                        <p className="text-xs text-muted-foreground">{test.description}</p>
                      )}
                      <p className="text-sm font-semibold">{formatPkrAmount(test.price)}</p>
                    </div>
                  </div>
                ))}
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
            {(selectedPatient || (activeTab === "register" && newPatient.first_name)) && (
              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span className="font-medium">
                      {activeTab === "register" 
                        ? `${newPatient.first_name} ${newPatient.last_name}`.trim()
                        : selectedPatient 
                          ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`.trim()
                          : "Not selected"
                      }
                      {activeTab === "register" && (
                        <Badge variant="secondary" className="ml-2">New Patient</Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doctor:</span>
                    <span className="font-medium">
                      {doctorId ? 
                        doctors?.find(d => d.id === doctorId) ? 
                          `Dr. ${doctors.find(d => d.id === doctorId)?.first_name} ${doctors.find(d => d.id === doctorId)?.last_name}` :
                          "Unknown Doctor"
                        : externalDoctorName || "External Doctor"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>X-ray Date:</span>
                    <span className="font-medium">{xrayDate ? format(xrayDate, "MMM dd, yyyy") : "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tests:</span>
                    <span className="font-medium">{selectedTests.length} selected</span>
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
                  (activeTab === "search" && !selectedPatient) ||
                  (activeTab === "register" && (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()))
                }
              >
                Continue to Confirmation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <XrayOrderConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        confirmationData={confirmationData}
        onConfirm={handleConfirm}
        isProcessing={isSubmitting}
      />
    </>
  );
}