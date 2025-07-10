import { useState } from "react";
import { useCreateAppointmentWithInvoice, useCreatePatientWithProfile, useDoctors } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames, useDoctorNames } from "@/hooks/useDisplayHelpers";
import { useDoctorAvailability, useCheckDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { useAuditLogger } from "@/hooks/useAuditLogger";
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
import { toast } from "sonner";
import { Plus, Search, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { cn } from "@/lib/utils";

export function EnhancedAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [doctorOpen, setDoctorOpen] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    const fullDateTime = `${appointmentDate}T${appointmentTime}:00`;

    try {
      const appointmentData = {
        appointment: {
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: fullDateTime,
          type: type.trim(),
          notes: notes.trim() || undefined,
          status: 'scheduled'
        },
        consultationFee,
        doctorName: `${selectedDoctorName?.first_name} ${selectedDoctorName?.last_name}`
      };

      const result = await createAppointmentWithInvoice.mutateAsync(appointmentData);
      
      // Log the audit event
      await logAction(
        "Created appointment with invoice",
        `Appointment scheduled for ${appointmentDate} at ${appointmentTime} with consultation fee ${formatCurrency(consultationFee)}`
      );
      
      toast.success("Appointment created successfully with invoice");
      
      // Generate and open PDF invoice
      const patientName = selectedPatient 
        ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`
        : `${newPatient.first_name} ${newPatient.last_name}`;
      
      const invoiceData = {
        invoice_number: result.invoice.invoice_number,
        created_at: result.invoice.created_at,
        amount: result.invoice.amount,
        description: result.invoice.description || `Consultation with Dr. ${selectedDoctorName?.first_name} ${selectedDoctorName?.last_name}`,
        due_date: result.invoice.due_date,
        status: result.invoice.status,
        patient: {
          users: {
            first_name: patientName.split(' ')[0],
            last_name: patientName.split(' ').slice(1).join(' '),
            email: selectedPatient?.profile?.email || ''
          }
        }
      };
      
      generateInvoicePDF(invoiceData);
      
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create appointment");
      console.error("Error creating appointment:", error);
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor *</Label>
            <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={doctorOpen}
                  className="w-full justify-between"
                >
                  {doctorId
                    ? (() => {
                        const doctor = doctors?.find((d) => d.id === doctorId);
                        const doctorName = doctorNames?.find(d => d.id === doctorId);
                        return `Dr. ${doctorName?.first_name} ${doctorName?.last_name} - ${formatCurrency(doctor?.consultation_fee || 0)}`;
                      })()
                    : "Select doctor..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search doctors..." />
                  <CommandList>
                    <CommandEmpty>No doctor found.</CommandEmpty>
                    <CommandGroup>
                      {doctors?.map((doctor) => {
                        const doctorName = doctorNames?.find(d => d.id === doctor.id);
                        return (
                          <CommandItem
                            key={doctor.id}
                            value={`${doctorName?.first_name} ${doctorName?.last_name} ${doctor.specialization}`}
                            onSelect={() => {
                              setDoctorId(doctor.id);
                              setDoctorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                doctorId === doctor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex justify-between items-center w-full">
                              <span>Dr. {doctorName?.first_name} {doctorName?.last_name} - {doctor.specialization}</span>
                              <span className="ml-2 text-green-600 font-medium">
                                {formatCurrency(doctor.consultation_fee || 0)}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedDoctor && (
              <div className="text-sm text-gray-600">
                Consultation Fee: <span className="font-medium text-green-600">{formatCurrency(consultationFee)}</span>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
              {appointmentDate && availability && !availability.canBook && (
                <div className="text-sm text-red-600 mt-1">
                  {!availability.isAvailable && "Doctor is not available on this date"}
                  {availability.isAvailable && !availability.isAcceptingAppointments && "Doctor is not accepting appointments on this date"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type *</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Consultation, Check-up, Follow-up"
              required
            />
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
                <div className="text-sm text-gray-600">
                  An invoice will be generated and opened in a new tab for printing/download.
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