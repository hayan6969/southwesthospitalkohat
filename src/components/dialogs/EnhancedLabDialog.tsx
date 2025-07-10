import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { formatPkrAmount } from "@/utils/currency";
import { generateLabInvoicePDF } from "@/utils/pdfGenerator";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  
  // New patient form
  const [newPatientForm, setNewPatientForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: ""
  });

  const queryClient = useQueryClient();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const { logCreate } = useAuditLogger();

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients-for-lab'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          patients (
            patient_number
          )
        `)
        .eq('role', 'patient');
      
      if (error) throw error;
      return data.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        patient_number: profile.patients?.[0]?.patient_number
      })) as Patient[];
    }
  });

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

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: patientData.email,
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
          date_of_birth: patientData.date_of_birth || null,
          address: patientData.address || null
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      return {
        id: authData.user.id,
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        email: patientData.email,
        phone: patientData.phone,
        patient_number: patientRecord.patient_number
      } as Patient;
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients-for-lab'] });
      setSelectedPatient(newPatient as Patient);
      setShowNewPatientForm(false);
      setNewPatientForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        address: ""
      });
      toast.success("New patient registered successfully");
    },
    onError: () => {
      toast.error("Failed to register new patient");
    }
  });

  // Create lab order mutation
  const createLabOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !selectedDoctor || selectedTests.length === 0) {
        throw new Error("Missing required fields");
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
              doctor_id: selectedDoctor,
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
      
      // Log audit event
      await logCreate(
        "Lab Order Created",
        `${selectedTests.length} lab tests ordered for ${selectedPatient?.first_name} ${selectedPatient?.last_name}`
      );

      // Generate and open PDF invoice
      try {
        const pdfBlob = await generateLabInvoicePDF({
          invoiceNumber: invoice.invoice_number,
          patientName: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
          patientEmail: selectedPatient?.email || '',
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

  const filteredPatients = patients?.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.patient_number?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleReset = () => {
    setSelectedPatient(null);
    setSelectedDoctor("");
    setSelectedTests([]);
    setNotes("");
    setSearchQuery("");
    setShowNewPatientForm(false);
    setOpen(false);
  };

  const handleCreatePatient = () => {
    if (!newPatientForm.first_name.trim() || !newPatientForm.last_name.trim() || !newPatientForm.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPatientMutation.mutate(newPatientForm);
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
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPatient ? (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="search">Search Patient</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by name, email, or patient ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewPatientForm(!showNewPatientForm)}
                      className="mt-6"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register New
                    </Button>
                  </div>

                  {showNewPatientForm && (
                    <Card className="p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Register New Patient</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="First Name *"
                          value={newPatientForm.first_name}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                        <Input
                          placeholder="Last Name *"
                          value={newPatientForm.last_name}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                        <Input
                          placeholder="Email *"
                          type="email"
                          value={newPatientForm.email}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <Input
                          placeholder="Phone"
                          value={newPatientForm.phone}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                        <Input
                          placeholder="Date of Birth"
                          type="date"
                          value={newPatientForm.date_of_birth}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        />
                        <Input
                          placeholder="Address"
                          value={newPatientForm.address}
                          onChange={(e) => setNewPatientForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          onClick={handleCreatePatient}
                          disabled={createPatientMutation.isPending}
                          size="sm"
                        >
                          {createPatientMutation.isPending ? "Creating..." : "Create Patient"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewPatientForm(false)}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  )}

                  {searchQuery && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <div className="font-medium">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {patient.email} • {patient.patient_number || 'No ID'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-500 text-center">
                          No patients found. Try a different search or register a new patient.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-800">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </div>
                      <div className="text-sm text-green-600">
                        {selectedPatient.email} • {selectedPatient.patient_number || 'No ID'}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Doctor Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordering Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ordering doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {getDoctorName(doctor.id, doctorNames || [])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Lab Tests Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lab Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {labTests?.map((test) => (
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
                )) || (
                  <div className="p-8 text-center text-gray-500">
                    No lab tests available. Please add tests in the admin panel.
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
              onClick={() => createLabOrderMutation.mutate()}
              disabled={!selectedPatient || !selectedDoctor || selectedTests.length === 0 || createLabOrderMutation.isPending}
            >
              {createLabOrderMutation.isPending ? "Creating Order..." : "Create Lab Order & Generate Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}