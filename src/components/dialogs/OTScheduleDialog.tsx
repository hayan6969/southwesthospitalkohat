import { useEffect, useMemo, useRef, useState } from "react";
import { useCreatePatientWithProfile, useDoctors } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames, useDoctorNames } from "@/hooks/useDisplayHelpers";
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
import { toast } from "sonner";
import { PatientDiscountBadge } from "@/components/PatientDiscountBadge";
import { Plus, Search, UserPlus, Building2, Banknote, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyPatientDiscount } from "@/utils/discountUtils";
import { formatPkrAmount } from "@/utils/currency";
import { generateOTPDF } from "@/utils/pdfGenerator";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    cnic: "",
    date_of_birth: "",
    address: "",
    blood_type: "",
    allergies: "",
  });
  const [doctorId, setDoctorId] = useState("");
  const [doctorExpense, setDoctorExpense] = useState("");
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [operationSearchQuery, setOperationSearchQuery] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [rooms, setRooms] = useState<OTRoom[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submissionLockRef = useRef(false);

  const createPatientWithProfile = useCreatePatientWithProfile();
  const { data: doctors } = useDoctors();
  const { data: doctorNames } = useDoctorNames();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);
  const { logAction } = useAuditLogger();
  const { profile, user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const [operationsRes, roomsRes] = await Promise.all([
        supabase
          .from("ot_operations")
          .select(`id, operation_name, ot_expenses(id, expense_name, cost)`),
        supabase
          .from("ot_rooms")
          .select("*")
          .eq("is_available", true)
          .order("room_name", { ascending: true }),
      ]);

      if (!operationsRes.error) {
        setOperations(
          (operationsRes.data || []).map((op: any) => ({
            ...op,
            expenses: op.ot_expenses || [],
          }))
        );
      }

      if (!roomsRes.error) {
        setRooms(roomsRes.data || []);
      }
    };

    fetchData();
  }, []);

  const filteredOperations = useMemo(
    () => operations.filter((op) => op.operation_name.toLowerCase().includes(operationSearchQuery.toLowerCase())),
    [operations, operationSearchQuery]
  );

  const selectedOperationDetails = useMemo(
    () => operations.filter((op) => selectedOperations.includes(op.id)),
    [operations, selectedOperations]
  );

  const totalOperationCost = selectedOperationDetails.reduce(
    (total, op) => total + op.expenses.reduce((sum, exp) => sum + exp.cost, 0),
    0
  );
  const totalCost = totalOperationCost + (parseFloat(doctorExpense) || 0);

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
      allergies: "",
    });
    setDoctorId("");
    setDoctorExpense("");
    setOperationDate(new Date().toISOString().split("T")[0]);
    setSelectedOperations([]);
    setOperationSearchQuery("");
    setRoomId("");
    setNotes("");
    setActiveTab("search");
    submissionLockRef.current = false;
    setSubmitting(false);
  };

  const toggleOperationSelection = (operationId: string) => {
    setSelectedOperations((prev) =>
      prev.includes(operationId) ? prev.filter((id) => id !== operationId) : [...prev, operationId]
    );
  };

  const getNextQueuePosition = async (roomUuid: string, opDate: string) => {
    const { data, error } = await supabase.rpc("get_next_ot_queue_position", {
      room_uuid: roomUuid,
      operation_date_param: opDate,
    });

    if (error) throw error;
    return data || 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLockRef.current || submitting) return;

    if (!selectedOperations.length || !roomId || !doctorId) {
      toast.error("Please select at least one operation, room, and doctor");
      return;
    }

    submissionLockRef.current = true;
    setSubmitting(true);

    try {
      let patientId = selectedPatient?.id;

      if (activeTab === "register") {
        if (!newPatient.first_name.trim() || !newPatient.last_name.trim() || !newPatient.phone.trim() || !newPatient.cnic.trim()) {
          throw new Error("Please fill in all required patient fields");
        }

        const result = await createPatientWithProfile.mutateAsync(newPatient);
        patientId = result.patient.id;
        toast.success("Patient registered successfully");
      }

      if (!patientId) {
        throw new Error("Please select or register a patient");
      }

      const baseQueuePosition = await getNextQueuePosition(roomId, operationDate);
      const doctorProfile = doctorNames?.find((d) => d.id === doctorId);
      const resolvedDoctorName = `Dr. ${doctorProfile?.first_name || ""} ${doctorProfile?.last_name || ""}`.trim();

      const scheduleResults = await Promise.all(
        selectedOperations.map(async (operationId, index) => {
          const operation = operations.find((op) => op.id === operationId);
          const operationCost = operation?.expenses.reduce((sum, exp) => sum + exp.cost, 0) || 0;

          return supabase
            .from("ot_schedules")
            .insert({
              patient_id: patientId,
              doctor_id: doctorId,
              doctor_name: resolvedDoctorName,
              doctor_expense: selectedOperations.length > 1 && index > 0 ? 0 : parseFloat(doctorExpense) || 0,
              operation_id: operationId,
              room_id: roomId,
              operation_date: operationDate,
              queue_position: baseQueuePosition + index,
              notes: notes.trim() || null,
              total_cost: operationCost + (selectedOperations.length > 1 && index > 0 ? 0 : parseFloat(doctorExpense) || 0),
              status: "pending",
            })
            .select()
            .single();
        })
      );

      const scheduleError = scheduleResults.find((result) => result.error)?.error;
      if (scheduleError) throw scheduleError;

      const invoiceNumber = `OT-${Date.now()}`;
      const otDiscount = await applyPatientDiscount(patientId, totalCost, "ot");

      const { error: invoiceError } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        patient_id: patientId,
        amount: otDiscount.discountedAmount,
        status: "paid",
        description: `OT Procedure: ${selectedOperationDetails.map((op) => op.operation_name).join(", ")}${otDiscount.discountLabel ? ` (${otDiscount.discountLabel}, Original: Rs. ${otDiscount.originalAmount})` : ""}`,
        paid_at: new Date().toISOString(),
        created_by: user?.id || profile?.id || null,
      });

      if (invoiceError) throw invoiceError;

      const { data: patientData } = await supabase
        .from("patients")
        .select(`patient_number, profiles!patients_id_fkey(email, phone)`)
        .eq("id", patientId)
        .single();

      const roomName = rooms.find((room) => room.id === roomId)?.room_name || "Unknown Room";
      const patientName = selectedPatient
        ? `${selectedPatient.profile?.first_name} ${selectedPatient.profile?.last_name}`
        : `${newPatient.first_name} ${newPatient.last_name}`;

      const items: Array<{ description: string; quantity: number | string; unitPrice: number | string; totalPrice: number | string; isHeader?: boolean }> = [];
      if ((parseFloat(doctorExpense) || 0) > 0) {
        items.push({ description: "--- DOCTOR CHARGES ---", quantity: "", unitPrice: "", totalPrice: "", isHeader: true });
        items.push({ description: `Doctor Fee (${resolvedDoctorName})`, quantity: 1, unitPrice: parseFloat(doctorExpense) || 0, totalPrice: parseFloat(doctorExpense) || 0 });
      }
      selectedOperationDetails.forEach((operation) => {
        items.push({ description: `--- ${operation.operation_name.toUpperCase()} ---`, quantity: "", unitPrice: "", totalPrice: "", isHeader: true });
        operation.expenses.forEach((expense) => {
          items.push({ description: expense.expense_name, quantity: 1, unitPrice: expense.cost, totalPrice: expense.cost });
        });
      });

      await generateOTPDF({
        invoiceNumber,
        patientName,
        patientId: patientData?.patient_number || "N/A",
        patientPhone: (patientData?.profiles as any)?.phone || "N/A",
        doctorName: resolvedDoctorName,
        procedure: selectedOperationDetails.map((op) => op.operation_name).join(", "),
        room: roomName,
        date: new Date(operationDate).toLocaleDateString(),
        totalAmount: totalCost,
        items,
        createdBy: user?.id,
      });

      await logAction(
        "Scheduled OT operations",
        `${selectedOperations.length} OT operation(s) scheduled for ${patientName} on ${operationDate} with ${resolvedDoctorName} in ${roomName}. Total cost: ${formatPkrAmount(totalCost)}`,
        profile?.id
      );

      toast.success(`${selectedOperations.length} OT operation(s) scheduled successfully! Starting queue position: ${baseQueuePosition}. Invoice generated: ${invoiceNumber}`);
      window.dispatchEvent(new CustomEvent("otScheduleUpdate"));
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to schedule OT operation");
      console.error("Error scheduling OT:", error);
    } finally {
      submissionLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) resetForm(); }}>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="w-4 h-4" /> Search Patient
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Register New
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                  {selectedPatient ? (
                    <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg text-gray-900">
                          {selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Patient ID: {selectedPatient.patient_number || "N/A"}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="search">Search by Patient ID</Label>
                        <Input id="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter Patient ID..." />
                      </div>
                      {searchResults && searchResults.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {searchResults.map((patient) => (
                            <div key={patient.id} className="p-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => setSelectedPatient(patient)}>
                              <div className="font-semibold text-lg text-gray-900">{patient.profile?.first_name} {patient.profile?.last_name}</div>
                              <div className="text-sm text-gray-600">Patient ID: {patient.patient_number || "Not assigned"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input value={newPatient.first_name} onChange={(e) => setNewPatient((prev) => ({ ...prev, first_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input value={newPatient.last_name} onChange={(e) => setNewPatient((prev) => ({ ...prev, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input value={newPatient.phone} onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>CNIC *</Label>
                      <Input value={newPatient.cnic} onChange={(e) => setNewPatient((prev) => ({ ...prev, cnic: e.target.value }))} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Doctor *</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger><SelectValue placeholder="Select doctor..." /></SelectTrigger>
                  <SelectContent>
                    {doctors?.map((doctor) => {
                      const doctorProfile = doctorNames?.find((d) => d.id === doctor.id);
                      return (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctorProfile?.first_name} {doctorProfile?.last_name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Doctor Expense (PKR)</Label>
                <Input type="number" value={doctorExpense} onChange={(e) => setDoctorExpense(e.target.value)} min="0" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operation Date *</Label>
                  <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Operating Room *</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => <SelectItem key={room.id} value={room.id}>{room.room_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Operation Types *</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search operations..." value={operationSearchQuery} onChange={(e) => setOperationSearchQuery(e.target.value)} className="pl-8" />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredOperations.map((operation) => {
                    const operationCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                    return (
                      <div key={operation.id} className={`p-3 border-b last:border-b-0 cursor-pointer ${selectedOperations.includes(operation.id) ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`} onClick={() => toggleOperationSelection(operation.id)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{operation.operation_name}</div>
                            <div className="text-sm text-gray-600">{operation.expenses.map((exp) => exp.expense_name).join(", ")}</div>
                          </div>
                          <div className="font-semibold text-green-600">{formatPkrAmount(operationCost)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or special instructions" />
              </div>

              {(selectedOperations.length > 0 || (parseFloat(doctorExpense) || 0) > 0) && (
                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="w-5 h-5" /> Cost Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedOperationDetails.map((operation) => {
                      const operationCost = operation.expenses.reduce((sum, exp) => sum + exp.cost, 0);
                      return <div key={operation.id} className="flex justify-between text-sm"><span>{operation.operation_name}</span><span className="font-medium">{formatPkrAmount(operationCost)}</span></div>;
                    })}
                    {(parseFloat(doctorExpense) || 0) > 0 && <div className="flex justify-between text-sm"><span>Doctor Expense</span><span className="font-medium">{formatPkrAmount(parseFloat(doctorExpense) || 0)}</span></div>}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total Amount:</span>
                      <span className="text-green-600">{formatPkrAmount(totalCost)}</span>
                    </div>
                    <PatientDiscountBadge patientId={selectedPatient?.id || null} originalAmount={totalCost} serviceType="ot" />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!selectedOperations.length || !roomId || !doctorId || (!selectedPatient && activeTab === "search") || submitting}>
              {submitting ? "Scheduling..." : "Confirm & Generate Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
