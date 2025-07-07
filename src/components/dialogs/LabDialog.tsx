
import { useState } from "react";
import { useCreateLabReport, usePatients, useDoctors } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function LabDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [notes, setNotes] = useState("");

  const createLabReport = useCreateLabReport();
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { logCreate } = useAuditLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !doctorId || !testName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const patient = patients?.find(p => p.id === patientId);
      const doctor = doctors?.find(d => d.id === doctorId);
      
      await createLabReport.mutateAsync({
        patient_id: patientId,
        doctor_id: doctorId,
        test_name: testName.trim(),
        test_date: testDate ? new Date(testDate).toISOString() : new Date().toISOString(),
        status: 'pending',
        notes: notes.trim() || undefined
      });
      
      // Log the audit event
      await logCreate(
        "Lab Order",
        `${testName.trim()} ordered for ${patient?.users?.first_name} ${patient?.users?.last_name} by Dr. ${doctor?.users?.first_name} ${doctor?.users?.last_name}`
      );
      
      toast.success("Lab order created successfully");
      setOpen(false);
      
      // Reset form
      setPatientId("");
      setDoctorId("");
      setTestName("");
      setTestDate("");
      setNotes("");
    } catch (error) {
      toast.error("Failed to create lab order");
      console.error("Error creating lab order:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Lab Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Lab Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.users?.first_name} {patient.users?.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Ordering Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors?.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.users?.first_name} {doctor.users?.last_name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testName">Test Name</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Complete Blood Count (CBC)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testDate">Test Date</Label>
            <Input
              id="testDate"
              type="datetime-local"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional instructions..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLabReport.isPending}>
              {createLabReport.isPending ? "Creating..." : "Create Lab Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
