import { useState, useEffect, useRef } from "react";
import { useCreateAppointmentWithInvoice, useCreatePatientWithProfile, useDoctors } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames, useDoctorNames } from "@/hooks/useDisplayHelpers";
import { useDoctorAvailability, useCheckDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PatientDiscountBadge } from "@/components/PatientDiscountBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Search, UserPlus, Check, ChevronsUpDown, X } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { getCurrentPakistanDate, getCurrentPakistanTimeString, formatDateForDisplay, formatTimeForDisplay, fromPakistanTime } from "@/utils/timezone";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const appointmentTypes = [
  "Consultation",
  "Follow-up",
  "Check-up",
  "Emergency",
  "Routine Visit",
  "Specialist Referral",
  "Preventive Care"
];

export function EnhancedAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  // doctorOpen state removed - using Select instead of Popover+Command
  
  // Search existing patient
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
  
  // Appointment details
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  
  const createAppointmentWithInvoice = useCreateAppointmentWithInvoice();
  const createPatientWithProfile = useCreatePatientWithProfile();
  const { data: doctors } = useDoctors();
  const { data: doctorNames } = useDoctorNames();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);
  const { logAction } = useAuditLogger();
  const { user } = useAuth();
  const { checkAvailability } = useCheckDoctorAvailability();
  const { data: availability } = useDoctorAvailability(doctorId, appointmentDate);

  const selectedDoctor = doctors?.find(d => d.id === doctorId);
  const selectedDoctorName = doctorNames?.find(d => d.id === doctorId);
  const consultationFee = selectedDoctor?.consultation_fee || 0;

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
    setAppointmentDate("");
    setAppointmentTime("");
    setType("");
    setNotes("");
    setActiveTab("search");
  };

  // Set current date and time when dialog opens using Pakistani timezone
  useEffect(() => {
    if (open) {
      setAppointmentDate(getCurrentPakistanDate());
      setAppointmentTime(getCurrentPakistanTimeString());
      submissionLockRef.current = false;
    }
  }, [open]);

  const submissionLockRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    
    if (!doctorId || !appointmentDate || !appointmentTime || !type.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check doctor availability
    try {
      const availabilityCheck = await checkAvailability(doctorId, appointmentDate);
      
      if (!availabilityCheck.canBook) {
        if (!availabilityCheck.isAvailable) {
          toast.error("This doctor is not available on the selected date");
          return;
        }
        if (!availabilityCheck.isAcceptingAppointments) {
          toast.error("This doctor is not accepting appointments for the selected date");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      toast.error("Failed to check doctor availability");
      return;
    }

    let patientId = selectedPatient?.id;
    
    // If registering new patient
    if (activeTab === "register") {
      if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()) {
        toast.error("Please fill in all required patient fields");
        return;
      }

      try {
        const patientData = {
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          phone: newPatient.phone,
          cnic: newPatient.cnic,
          date_of_birth: newPatient.date_of_birth,
          address: newPatient.address,
          blood_type: newPatient.blood_type,
          allergies: newPatient.allergies
        };
        
        const result = await createPatientWithProfile.mutateAsync(patientData);
        patientId = result.patient.id;
        
        toast.success("Patient registered successfully");
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

    // Convert Pakistani time to UTC for database storage
    const localDateTime = `${appointmentDate}T${appointmentTime}:00`;
    const utcDateTime = fromPakistanTime(localDateTime).toISOString();

    try {
      const appointmentData = {
        appointment: {
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: utcDateTime,
          type: type.trim(),
          notes: notes.trim() || undefined,
          status: 'scheduled'
        },
        consultationFee,
        doctorName: `${selectedDoctorName?.first_name} ${selectedDoctorName?.last_name}`
      };

      const result = await createAppointmentWithInvoice.mutateAsync(appointmentData);
      
      // Log the audit event with current user ID
      await logAction(
        "Created appointment with invoice",
        `Appointment scheduled for ${appointmentDate} at ${appointmentTime} with consultation fee ${formatCurrency(consultationFee)}`,
        user?.id
      );
      
      toast.success("Appointment created successfully with invoice");
      
      // Get patient info for PDF - for new patients, we need to fetch the patient_number
      let patientForPdf = selectedPatient;
      if (activeTab === "register") {
        // For newly registered patients, fetch the patient data to get the patient_number
        const { data: newPatientData } = await supabase
          .from('patients')
          .select('patient_number')
          .eq('id', patientId)
          .single();
        
        patientForPdf = {
          patient_number: newPatientData?.patient_number || 'N/A',
          profile: {
            first_name: newPatient.first_name,
            last_name: newPatient.last_name,
            email: `patient${newPatient.phone}@hims.app` // Default email format
          }
        };
      }
      
      // Generate and open PDF invoice
      const patientName = patientForPdf 
        ? `${patientForPdf.profile?.first_name} ${patientForPdf.profile?.last_name}`
        : `${newPatient.first_name} ${newPatient.last_name}`;
      
      const invoiceData = {
        invoice_number: result.invoice.invoice_number,
        created_at: result.invoice.created_at,
        amount: result.invoice.amount,
        description: result.invoice.description || `Consultation with Dr. ${selectedDoctorName?.first_name} ${selectedDoctorName?.last_name}`,
        due_date: result.invoice.due_date,
        status: result.invoice.status,
        patient: {
          patient_number: patientForPdf?.patient_number || 'N/A',
          users: {
            first_name: patientName.split(' ')[0],
            last_name: patientName.split(' ').slice(1).join(' '),
            email: patientForPdf?.profile?.email || ''
          }
        }
      };
      
      await generateInvoicePDF(invoiceData);
      
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create appointment");
      console.error("Error creating appointment:", error);
    } finally {
      submissionLockRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
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
                  ) : (
                    <>
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
                      )}
                    </>
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor *</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select doctor..." />
              </SelectTrigger>
              <SelectContent portal={false} className="z-[9999] max-h-[300px] bg-popover">
                {doctors?.map((doctor) => {
                  const doctorName = doctorNames?.find(d => d.id === doctor.id);
                  return (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctorName?.first_name} {doctorName?.last_name} - {doctor.specialization} ({formatCurrency(doctor.consultation_fee || 0)})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedDoctor && (
              <div className="text-sm text-gray-600">
                Consultation Fee: <span className="font-medium text-green-600">{formatCurrency(consultationFee)}</span>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((appointmentType) => (
                  <SelectItem key={appointmentType} value={appointmentType}>
                    {appointmentType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <Label className="text-sm font-medium">Scheduled for:</Label>
            <div className="text-sm text-muted-foreground">
              <div>{appointmentDate && appointmentTime ? 
                `${formatDateForDisplay(appointmentDate)} at ${formatTimeForDisplay(`2000-01-01T${appointmentTime}:00`)}` : 
                'No date/time selected'
              }</div>
              <div className="text-xs mt-1">Using Pakistani date and time</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          {/* Summary */}
          {(selectedPatient || (activeTab === "register" && newPatient.first_name)) && selectedDoctor && (
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Appointment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <strong>Patient:</strong> {
                    selectedPatient 
                      ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`
                      : `${newPatient.first_name} ${newPatient.last_name}`
                  }
                </div>
                <div>
                  <strong>Doctor:</strong> Dr. {selectedDoctorName?.first_name} {selectedDoctorName?.last_name}
                </div>
                <div>
                  <strong>Consultation Fee:</strong> <span className="text-green-600 font-medium">{formatCurrency(consultationFee)}</span>
                </div>
                <PatientDiscountBadge 
                  patientId={selectedPatient?.id || (activeTab === "register" ? null : null)} 
                  originalAmount={consultationFee} 
                  serviceType="consultation"
                />
                <div className="text-sm text-muted-foreground">
                  An invoice will be generated and opened in a new tab for printing/download.
                  {selectedPatient?.id && " Discount (if any) will be applied automatically."}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                createAppointmentWithInvoice.isPending || 
                createPatientWithProfile.isPending ||
                (availability && !availability.canBook)
              }
            >
              {createAppointmentWithInvoice.isPending || createPatientWithProfile.isPending 
                ? "Creating..." 
                : "Create Appointment & Invoice"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}