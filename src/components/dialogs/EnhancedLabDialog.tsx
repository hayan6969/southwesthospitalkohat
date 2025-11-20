import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, UserPlus, Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { useCreatePatientWithProfile, useCreateLabOrderWithInvoice } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { generateLabInvoicePDF } from "@/utils/pdfGenerator";
import { cn } from "@/lib/utils";
import { LabOrderConfirmationDialog } from "./LabOrderConfirmationDialog";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  patient_number?: string;
}

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialization?: string;
}

interface LabTest {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export function EnhancedLabDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [isExternalDoctor, setIsExternalDoctor] = useState(false);
  const [externalDoctorName, setExternalDoctorName] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  
  // New patient form
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

  const queryClient = useQueryClient();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);
  const { logCreate } = useAuditLogger();
  const { user } = useAuth();
  const createPatientWithProfile = useCreatePatientWithProfile();
  const createLabOrderWithInvoice = useCreateLabOrderWithInvoice();

  // Fetch lab tests
  const { data: labTests } = useQuery({
    queryKey: ['lab-tests-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as LabTest[];
    }
  });

  // Filter lab tests based on search
  const filteredLabTests = labTests?.filter(test =>
    test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
    test.description?.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
    test.category?.toLowerCase().includes(testSearchQuery.toLowerCase())
  ) || [];

  // Show confirmation dialog before processing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data first
    if (activeTab === "register") {
      if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()) {
        toast.error("Please fill in all required patient fields");
        return;
      }
    }

    if (!selectedPatient && activeTab !== "register") {
      toast.error("Please select a patient");
      return;
    }

    if ((!selectedDoctor && !isExternalDoctor) || selectedTests.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isExternalDoctor && !externalDoctorName.trim()) {
      toast.error("External doctor name is required");
      return;
    }

    // Prepare confirmation data
    const selectedLabTests = labTests?.filter(test => selectedTests.includes(test.id)) || [];
    const totalAmount = selectedLabTests.reduce((sum, test) => sum + test.price, 0);
    
    const patientName = activeTab === "register" 
      ? `${newPatient.first_name} ${newPatient.last_name}`
      : `${selectedPatient?.profile?.first_name} ${selectedPatient?.profile?.last_name}`;
    
    const doctorName = isExternalDoctor 
      ? externalDoctorName 
      : (doctorNames?.find(d => d.id === selectedDoctor)?.first_name + ' ' + 
         doctorNames?.find(d => d.id === selectedDoctor)?.last_name) || 'Unknown Doctor';

    const confirmData = {
      patientName,
      patientId: selectedPatient?.patient_number,
      patientPhone: activeTab === "register" ? newPatient.phone : selectedPatient?.profile?.phone,
      doctorName,
      selectedTests: selectedLabTests,
      totalAmount,
      notes: notes.trim() || undefined,
      isNewPatient: activeTab === "register"
    };

    setConfirmationData(confirmData);
    setShowConfirmation(true);
  };

  // Process the actual lab order creation
  const handleConfirmOrder = async () => {
    let patientId = selectedPatient?.id;
    let patientNumber = selectedPatient?.patient_number;
    
    // If registering new patient, create them first
    if (activeTab === "register") {
      try {
        const patientData = {
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          phone: newPatient.phone,
          cnic: newPatient.cnic
        };
        
        const result = await createPatientWithProfile.mutateAsync(patientData);
        patientId = result.patient.id;
        patientNumber = result.patient.patient_number;
        
        toast.success("Patient registered successfully");
      } catch (error: any) {
        console.error("Error creating patient:", error);
        if (error.message === 'DUPLICATE_PHONE') {
          toast.error("A patient with this phone number already exists");
        } else {
          toast.error("Failed to register patient");
        }
        return;
      }
    }

    try {
      const selectedLabTests = labTests?.filter(test => selectedTests.includes(test.id)) || [];
      const totalAmount = selectedLabTests.reduce((sum, test) => sum + test.price, 0);

      // Validate doctor_id before creating order
      let validatedDoctorId = null;
      if (!isExternalDoctor && selectedDoctor) {
        // Verify the doctor exists
        const doctorExists = doctorNames?.some(d => d.id === selectedDoctor);
        if (!doctorExists) {
          toast.error("Selected doctor is invalid. Please select a valid doctor or use external doctor option.");
          return;
        }
        validatedDoctorId = selectedDoctor;
      }

      console.log('Creating lab order with doctor_id:', validatedDoctorId, 'isExternalDoctor:', isExternalDoctor);

      const labOrderData = {
        patient_id: patientId,
        doctor_id: validatedDoctorId,
        external_doctor_name: isExternalDoctor ? externalDoctorName.trim() : null,
        selectedTests: selectedLabTests,
        notes: notes.trim() || null,
        totalAmount,
        invoiceNumber: `LAB-${Date.now()}`,
        invoiceDescription: `Lab Tests: ${selectedLabTests.map(test => test.name).join(', ')}`
      };

      const result = await createLabOrderWithInvoice.mutateAsync(labOrderData);

      // Log the audit event
      await logCreate(
        "Created lab order with invoice",
        `Lab order created for patient ${patientNumber || 'N/A'} with ${selectedLabTests.length} tests, total amount ${formatPkrAmount(totalAmount)}`,
        user?.id
      );

      toast.success(`Lab order created successfully with ${selectedLabTests.length} tests`);

      // Generate and open PDF invoice
      const patientName = selectedPatient ? 
        `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}` :
        `${newPatient.first_name} ${newPatient.last_name}`;
      
      const doctorName = isExternalDoctor ? 
        externalDoctorName : 
        (doctorNames?.find(d => d.id === selectedDoctor)?.first_name + ' ' + 
         doctorNames?.find(d => d.id === selectedDoctor)?.last_name) || 'Unknown Doctor';

      const invoiceData = {
        invoiceNumber: result.invoice.invoice_number,
        patientName: patientName,
        patientEmail: selectedPatient?.profile?.email || `${newPatient.phone}@patient.local`,
        patientId: patientNumber || 'N/A',
        patientPhone: selectedPatient?.profile?.phone || newPatient.phone,
        tests: selectedLabTests.map(test => ({
          name: test.name,
          price: test.price,
          description: test.description
        })),
        totalAmount,
        issueDate: new Date().toLocaleDateString()
      };

      await generateLabInvoicePDF(invoiceData);

      // Reset form and close dialogs
      resetForm();
      setOpen(false);
      setShowConfirmation(false);
      setConfirmationData(null);
    } catch (error) {
      console.error("Error creating lab order:", error);
      toast.error("Failed to create lab order");
    }
  };

  const resetForm = () => {
    setActiveTab("search");
    setSearchTerm("");
    setSelectedPatient(null);
    setSelectedDoctor("");
    setSelectedTests([]);
    setTestSearchQuery("");
    setNotes("");
    setIsExternalDoctor(false);
    setExternalDoctorName("");
    setShowConfirmation(false);
    setConfirmationData(null);
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
  };

  const getTotalAmount = () => {
    const selectedLabTests = labTests?.filter(test => selectedTests.includes(test.id)) || [];
    return selectedLabTests.reduce((sum, test) => sum + test.price, 0);
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Lab Order
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lab Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Selection - Matching EnhancedAppointmentDialog pattern */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Patient
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Register New
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="search" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search by Patient ID</Label>
                    <Input
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Enter Patient ID (e.g. P-0001)..."
                    />
                  </div>
                  
                  {searchResults && searchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Patient</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((patient) => {
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Doctor Selection - Searchable with External Option */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordering Doctor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="external-doctor"
                  checked={isExternalDoctor}
                  onChange={(e) => {
                    setIsExternalDoctor(e.target.checked);
                    if (e.target.checked) {
                      setSelectedDoctor("");
                    } else {
                      setExternalDoctorName("");
                    }
                  }}
                />
                <Label htmlFor="external-doctor">External Doctor</Label>
              </div>
              
              {isExternalDoctor ? (
                <div className="space-y-2">
                  <Label htmlFor="external-name">External Doctor Name *</Label>
                  <Input
                    id="external-name"
                    value={externalDoctorName}
                    onChange={(e) => setExternalDoctorName(e.target.value)}
                    placeholder="Enter external doctor's name"
                  />
                </div>
              ) : (
                <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={doctorOpen}
                      className="w-full justify-between"
                    >
                      {selectedDoctor
                        ? getDoctorName(selectedDoctor, doctorNames || [])
                        : "Select ordering doctor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search doctors..." />
                      <CommandEmpty>No doctor found.</CommandEmpty>
                      <CommandGroup>
                        <CommandList>
                          {doctorNames?.map((doctor) => (
                            <CommandItem
                              key={doctor.id}
                              value={doctor.id}
                              onSelect={(currentValue) => {
                                setSelectedDoctor(currentValue === selectedDoctor ? "" : currentValue);
                                setDoctorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedDoctor === doctor.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {getDoctorName(doctor.id, doctorNames || [])}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>

          {/* Lab Tests Selection - Searchable */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lab Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-search">Search Tests</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="test-search"
                    placeholder="Search lab tests..."
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {filteredLabTests.length > 0 ? (
                  filteredLabTests.map((test) => (
                    <div
                      key={test.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                        selectedTests.includes(test.id) 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleTestSelection(test.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{test.name}</div>
                          {test.description && (
                            <div className="text-sm text-gray-600">{test.description}</div>
                          )}
                          {test.category && (
                            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                              {test.category}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatPkrAmount(test.price)}
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.id)}
                            onChange={() => toggleTestSelection(test.id)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    {testSearchQuery ? "No tests found matching your search." : "No lab tests available. Please add tests in the admin panel."}
                  </div>
                )}
              </div>
              
              {selectedTests.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Selected Tests: {selectedTests.length}
                    </span>
                    <span className="font-bold text-blue-600">
                      Total: {formatPkrAmount(getTotalAmount())}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions, preparation notes, etc..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createLabOrderWithInvoice.isPending || createPatientWithProfile.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createLabOrderWithInvoice.isPending || createPatientWithProfile.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                `Review Lab Order (${formatPkrAmount(selectedTests.reduce((sum, testId) => {
                  const test = labTests?.find(t => t.id === testId);
                  return sum + (test?.price || 0);
                }, 0))})`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <LabOrderConfirmationDialog
      open={showConfirmation}
      onOpenChange={setShowConfirmation}
      confirmationData={confirmationData}
      onConfirm={handleConfirmOrder}
      isProcessing={createLabOrderWithInvoice.isPending || createPatientWithProfile.isPending}
    />
    </>
  );
}