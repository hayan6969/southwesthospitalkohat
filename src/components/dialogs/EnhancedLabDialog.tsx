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
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { generateLabInvoicePDF } from "@/utils/pdfGenerator";
import { cn } from "@/lib/utils";

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
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  
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

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-for-lab'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor');
      
      if (error) throw error;
      return data as Doctor[];
    }
  });

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

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      // First create auth user with a temporary email if phone is provided
      const email = patientData.email || `${patientData.phone}@temp.local`;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'temp123456', // Temporary password
        email_confirm: true,
        user_metadata: {
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          role: 'patient'
        }
      });

      if (authError) throw authError;

      // Then create patient record
      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .insert([{
          id: authData.user.id,
          cnic: patientData.cnic,
          date_of_birth: patientData.date_of_birth || null,
          address: patientData.address || null,
          blood_type: patientData.blood_type || null,
          allergies: patientData.allergies || null
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      return {
        id: authData.user.id,
        profile: {
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          email: email,
          phone: patientData.phone
        },
        patient_number: patientRecord.patient_number
      };
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients-for-lab'] });
      setSelectedPatient(newPatient);
      setActiveTab("search");
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
      toast.success("Patient registered successfully");
    },
    onError: () => {
      toast.error("Failed to register patient");
    }
  });

  // Create lab order mutation
  const createLabOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || (!selectedDoctor && !isExternalDoctor) || selectedTests.length === 0) {
        throw new Error("Missing required fields");
      }

      if (isExternalDoctor && !externalDoctorName.trim()) {
        throw new Error("External doctor name is required");
      }

      const selectedLabTests = labTests?.filter(test => selectedTests.includes(test.id)) || [];
      const totalAmount = selectedLabTests.reduce((sum, test) => sum + test.price, 0);

      // Create invoice first
      const invoiceNumber = `LAB-${Date.now()}`;
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          patient_id: selectedPatient.id,
          amount: totalAmount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          invoice_number: invoiceNumber,
          description: `Lab Tests: ${selectedLabTests.map(t => t.name).join(', ')}`
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create lab reports for each test
      const labReports = await Promise.all(
        selectedTests.map(async (testId) => {
          const test = labTests?.find(t => t.id === testId);
          const { data, error } = await supabase
            .from('lab_reports')
            .insert([{
              patient_id: selectedPatient.id,
              doctor_id: isExternalDoctor ? null : selectedDoctor,
              external_doctor_name: isExternalDoctor ? externalDoctorName.trim() : null,
              test_id: testId,
              test_name: test?.name || '',
              price: test?.price || 0,
              status: 'pending',
              notes: notes.trim() || null,
              invoice_id: invoice.id
            }])
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );

      return { labReports, invoice, selectedLabTests };
    },
    onSuccess: async ({ invoice, selectedLabTests }) => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      
      // Log audit event with current user ID
      await logCreate(
        "Lab Order Created",
        `${selectedTests.length} lab tests ordered for ${selectedPatient?.profile?.first_name} ${selectedPatient?.profile?.last_name}`,
        user?.id
      );

      // Generate and open PDF invoice
      try {
        const pdfBlob = await generateLabInvoicePDF({
          invoiceNumber: invoice.invoice_number,
          patientName: `${selectedPatient?.profile?.first_name} ${selectedPatient?.profile?.last_name}`,
          patientEmail: selectedPatient?.profile?.email || '',
          patientId: selectedPatient?.patient_number || 'N/A',
          patientPhone: selectedPatient?.profile?.phone || '',
          tests: selectedLabTests.map(test => ({
            name: test.name,
            price: test.price,
            description: test.description || ''
          })),
          totalAmount: invoice.amount,
          issueDate: new Date().toLocaleDateString()
        });

        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error("Lab order created but PDF generation failed");
      }

      toast.success("Lab order created and invoice generated successfully");
      handleReset();
    },
    onError: (error) => {
      toast.error("Failed to create lab order");
      console.error("Error creating lab order:", error);
    }
  });

  const handleReset = () => {
    setSelectedPatient(null);
    setSelectedDoctor("");
    setSelectedTests([]);
    setNotes("");
    setSearchTerm("");
    setTestSearchQuery("");
    setIsExternalDoctor(false);
    setExternalDoctorName("");
    setActiveTab("search");
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
    setOpen(false);
  };

  const handleCreatePatient = () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPatientMutation.mutate(newPatient);
  };

  const getTotalAmount = () => {
    const selectedLabTests = labTests?.filter(test => selectedTests.includes(test.id)) || [];
    return selectedLabTests.reduce((sum, test) => sum + test.price, 0);
  };

  const getSelectedTestsDetails = () => {
    return labTests?.filter(test => selectedTests.includes(test.id)) || [];
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  return (
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
                      placeholder="Complete address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Known Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, allergies: e.target.value }))}
                      placeholder="List any known allergies..."
                      rows={2}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreatePatient}
                    disabled={createPatientMutation.isPending}
                    className="w-full"
                  >
                    {createPatientMutation.isPending ? "Registering..." : "Register Patient"}
                  </Button>
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
                          {doctors?.map((doctor) => (
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
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmationOpen(true)}
              disabled={!selectedPatient || (!selectedDoctor && !isExternalDoctor) || selectedTests.length === 0}
            >
              Confirm & Create Invoice
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Confirm Lab Order
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div><strong>Patient:</strong> {selectedPatient?.profile?.first_name} {selectedPatient?.profile?.last_name}</div>
                <div><strong>Patient ID:</strong> {selectedPatient?.patient_number || 'Not assigned'}</div>
                <div><strong>Doctor:</strong> {isExternalDoctor ? externalDoctorName : getDoctorName(selectedDoctor, doctorNames || [])}</div>
                {notes && <div><strong>Notes:</strong> {notes}</div>}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">Selected Tests ({selectedTests.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto bg-white rounded border p-2">
                {getSelectedTestsDetails().map((test) => (
                  <div key={test.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{test.name}</div>
                      {test.description && (
                        <div className="text-sm text-gray-600">{test.description}</div>
                      )}
                    </div>
                    <div className="font-semibold text-green-600">
                      {formatPkrAmount(test.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-green-600">{formatPkrAmount(getTotalAmount())}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setConfirmationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmationOpen(false);
                createLabOrderMutation.mutate();
              }}
              disabled={createLabOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createLabOrderMutation.isPending ? "Creating Order..." : "Confirm & Generate Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}