import { useState, useEffect } from "react";
import { useCreatePatientWithProfile, useDoctors } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames, useDoctorNames } from "@/hooks/useDisplayHelpers";
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
import { Plus, Search, UserPlus, Check, ChevronsUpDown, Building2, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { cn } from "@/lib/utils";

interface OTOperation {
  id: string;
  operation_name: string;
  expenses: {
    id: string;
    expense_name: string;
    cost: number;
  }[];
}

interface OTRoom {
  id: string;
  room_name: string;
  is_available: boolean;
}

export function OTScheduleDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  
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
  
  // OT Schedule details
  const [doctorId, setDoctorId] = useState("");
  const [doctorExpense, setDoctorExpense] = useState<string>("");
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationId, setOperationId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Data
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [rooms, setRooms] = useState<OTRoom[]>([]);
  
  const createPatientWithProfile = useCreatePatientWithProfile();
  const { data: doctors } = useDoctors();
  const { data: doctorNames } = useDoctorNames();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);
  const { logAction } = useAuditLogger();

  useEffect(() => {
    fetchOperations();
    fetchRooms();
  }, []);

  const fetchOperations = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_operations")
        .select(`
          id,
          operation_name,
          ot_expenses (
            id,
            expense_name,
            cost
          )
        `);

      if (error) throw error;
      
      const formattedOperations = data?.map(op => ({
        ...op,
        expenses: op.ot_expenses || []
      })) || [];

      setOperations(formattedOperations);
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_rooms")
        .select("*")
        .eq("is_available", true)
        .order("room_name", { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const selectedOperation = operations.find(op => op.id === operationId);
  const operationCost = selectedOperation?.expenses.reduce((sum, exp) => sum + exp.cost, 0) || 0;
  const totalCost = operationCost + (parseFloat(doctorExpense) || 0);

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
    setDoctorExpense("");
    setOperationDate(new Date().toISOString().split('T')[0]);
    setOperationId("");
    setRoomId("");
    setNotes("");
    setActiveTab("search");
  };

  const handleDoctorChange = (selectedDoctorId: string) => {
    setDoctorId(selectedDoctorId);
    const selectedDoctor = doctors?.find(d => d.id === selectedDoctorId);
    if (selectedDoctor) {
      const doctorProfile = doctorNames?.find(d => d.id === selectedDoctorId);
      // Set the doctor's consultation fee as the default expense
      setDoctorExpense(selectedDoctor.consultation_fee?.toString() || "0");
    }
  };

  const getNextQueuePosition = async (roomUuid: string, opDate: string) => {
    try {
      const { data, error } = await supabase.rpc('get_next_ot_queue_position', {
        room_uuid: roomUuid,
        operation_date_param: opDate
      });
      
      if (error) throw error;
      return data || 1;
    } catch (error) {
      console.error("Error getting queue position:", error);
      return 1;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!operationId || !roomId || !doctorId) {
      toast.error("Please select operation type, room, and doctor");
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

    try {
      // Get next queue position
      const queuePosition = await getNextQueuePosition(roomId, operationDate);

      // Create OT schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("ot_schedules")
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          doctor_name: (() => {
            const doctorProfile = doctorNames?.find(d => d.id === doctorId);
            return `Dr. ${doctorProfile?.first_name} ${doctorProfile?.last_name}`;
          })(),
          doctor_expense: parseFloat(doctorExpense) || 0,
          operation_id: operationId,
          room_id: roomId,
          operation_date: operationDate,
          queue_position: queuePosition,
          notes: notes.trim() || null,
          total_cost: totalCost,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Generate invoice
      const invoiceNumber = `OT-${Date.now()}`;
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          amount: totalCost,
          status: 'paid',
          paid_at: new Date().toISOString(),
          invoice_number: invoiceNumber,
          description: `OT Operation: ${selectedOperation?.operation_name} - Dr. ${doctorNames?.find(d => d.id === doctorId)?.first_name} ${doctorNames?.find(d => d.id === doctorId)?.last_name}`,
          due_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const patientName = selectedPatient 
        ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`
        : `${newPatient.first_name} ${newPatient.last_name}`;
      
      const roomName = rooms.find(r => r.id === roomId)?.room_name || "Unknown Room";
      
      // Generate and open PDF invoice
      const { generateInvoicePDF } = await import("@/utils/pdfGenerator");
      const invoiceForPDF = {
        ...invoiceData,
        patient: {
          users: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: selectedPatient?.profile?.email || ''
          }
        }
      };
      
      // Generate and open PDF
      await generateInvoicePDF(invoiceForPDF);
      
      // Log the audit event
      const selectedDoctorName = `Dr. ${doctorNames?.find(d => d.id === doctorId)?.first_name} ${doctorNames?.find(d => d.id === doctorId)?.last_name}`;
      await logAction(
        "Scheduled OT operation",
        `OT scheduled for ${patientName} on ${operationDate} - ${selectedOperation?.operation_name} with ${selectedDoctorName} in ${roomName}. Total cost: ${formatPkrAmount(totalCost)}`
      );
      
      toast.success(`OT operation scheduled successfully! Queue position: ${queuePosition}. Invoice generated: ${invoiceNumber}`);
      
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to schedule OT operation");
      console.error("Error scheduling OT:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Schedule OT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Schedule OT Operation
          </DialogTitle>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newPatient.address}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, allergies: e.target.value }))}
                      placeholder="Any known allergies"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* OT Operation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                       {doctorId ? (() => {
                         const selectedDoctor = doctorNames?.find(d => d.id === doctorId);
                         return `Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name}`;
                       })() : "Select internal doctor..."}
                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                   <PopoverContent className="w-full p-0">
                     <Command>
                       <CommandInput placeholder="Search internal doctors..." />
                       <CommandList>
                         <CommandEmpty>No internal doctor found.</CommandEmpty>
                         <CommandGroup>
                           {doctors?.map((doctor) => {
                             const doctorProfile = doctorNames?.find(d => d.id === doctor.id);
                             return (
                               <CommandItem
                                 key={doctor.id}
                                 value={`${doctorProfile?.first_name} ${doctorProfile?.last_name} ${doctor.specialization}`}
                                 onSelect={() => {
                                   handleDoctorChange(doctor.id);
                                   setDoctorOpen(false);
                                 }}
                               >
                                 <Check
                                   className={cn(
                                     "mr-2 h-4 w-4",
                                     doctorId === doctor.id ? "opacity-100" : "opacity-0"
                                   )}
                                 />
                                 <div className="flex flex-col">
                                   <span>Dr. {doctorProfile?.first_name} {doctorProfile?.last_name}</span>
                                   <span className="text-sm text-gray-500">
                                     {doctor.specialization} • Fee: {formatPkrAmount(doctor.consultation_fee || 0)}
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
               </div>

              {/* Doctor Expense */}
              <div className="space-y-2">
                <Label htmlFor="doctorExpense">Doctor Expense (PKR)</Label>
                <Input
                  id="doctorExpense"
                  type="number"
                  value={doctorExpense}
                  onChange={(e) => setDoctorExpense(e.target.value)}
                  placeholder="Enter doctor expense"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="operationDate">Operation Date *</Label>
                  <Input
                    id="operationDate"
                    type="date"
                    value={operationDate}
                    onChange={(e) => setOperationDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Operating Room *</Label>
                  <Select value={roomId} onValueChange={setRoomId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.room_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Operation Selection */}
              <div className="space-y-2">
                <Label htmlFor="operation">Operation Type *</Label>
                <Popover open={operationOpen} onOpenChange={setOperationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={operationOpen}
                      className="w-full justify-between"
                    >
                      {operationId
                        ? selectedOperation?.operation_name
                        : "Select operation type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search operations..." />
                      <CommandList>
                        <CommandEmpty>No operation found.</CommandEmpty>
                        <CommandGroup>
                          {operations.map((operation) => {
                            const totalOperationCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                            return (
                              <CommandItem
                                key={operation.id}
                                value={operation.operation_name}
                                onSelect={() => {
                                  setOperationId(operation.id);
                                  setOperationOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    operationId === operation.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <div className="font-medium">{operation.operation_name}</div>
                                  <div className="text-sm text-gray-500">
                                    Cost: {formatPkrAmount(totalOperationCost)}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or special instructions"
                />
              </div>

              {/* Cost Summary */}
              {(operationId || (parseFloat(doctorExpense) || 0) > 0) && (
                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="w-5 h-5" />
                      Cost Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedOperation && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Operation: {selectedOperation.operation_name}</span>
                          <span className="font-medium">{formatPkrAmount(operationCost)}</span>
                        </div>
                        {selectedOperation.expenses.map((expense) => (
                          <div key={expense.id} className="flex justify-between text-xs text-gray-600 ml-4">
                            <span>• {expense.expense_name}</span>
                            <span>{formatPkrAmount(expense.cost)}</span>
                          </div>
                        ))}
                      </>
                    )}
                     {(parseFloat(doctorExpense) || 0) > 0 && (
                       <div className="flex justify-between text-sm">
                         <span>Doctor Expense: {(() => {
                           const selectedDoctor = doctorNames?.find(d => d.id === doctorId);
                           return `Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name}`;
                         })()}</span>
                         <span className="font-medium">{formatPkrAmount(parseFloat(doctorExpense) || 0)}</span>
                       </div>
                     )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total Amount:</span>
                      <span className="text-green-600">{formatPkrAmount(totalCost)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Schedule OT Operation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}