
import { useState } from "react";
import { useCreateLabReport, usePatients, useDoctors } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function LabDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testDate, setTestDate] = useState("");
  const [notes, setNotes] = useState("");

  const createLabReport = useCreateLabReport();
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const { logCreate } = useAuditLogger();

  // Fetch lab tests
  const { data: labTests } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !doctorId || selectedTests.length === 0) {
      toast.error("Please fill in all required fields and select at least one test");
      return;
    }

    try {
      const patient = patients?.find(p => p.id === patientId);
      const doctor = doctors?.find(d => d.id === doctorId);
      
      // Create lab reports for each selected test
      for (const testId of selectedTests) {
        const test = labTests?.find(t => t.id === testId);
        await createLabReport.mutateAsync({
          patient_id: patientId,
          doctor_id: doctorId,
          test_id: testId,
          test_name: test?.name || '',
          test_date: testDate ? new Date(testDate).toISOString() : new Date().toISOString(),
          status: 'pending',
          notes: notes.trim() || undefined,
          price: test?.price || 0
        });
      }
      
      // Log the audit event
      const testNames = selectedTests.map(testId => 
        labTests?.find(t => t.id === testId)?.name || ''
      ).join(', ');
      
      await logCreate(
        "Lab Order",
        `${testNames} ordered for ${getPatientName(patientId, patientNames || [])} by ${getDoctorName(doctorId, doctorNames || [])}`
      );
      
      toast.success(`${selectedTests.length} lab test(s) ordered successfully`);
      setOpen(false);
      
      // Reset form
      setPatientId("");
      setDoctorId("");
      setSelectedTests([]);
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
                    {getPatientName(patient.id, patientNames || [])}
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
                    {getDoctorName(doctor.id, doctorNames || [])} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Tests</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {labTests?.map((test) => (
                <div key={test.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={test.id}
                    checked={selectedTests.includes(test.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTests([...selectedTests, test.id]);
                      } else {
                        setSelectedTests(selectedTests.filter(id => id !== test.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <label htmlFor={test.id} className="text-sm font-medium cursor-pointer">
                      {test.name}
                    </label>
                    {test.description && (
                      <p className="text-xs text-gray-500">{test.description}</p>
                    )}
                    <p className="text-xs text-green-600 font-medium">
                      PKR {test.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {!labTests || labTests.length === 0 && (
                <p className="text-sm text-gray-500">No lab tests available</p>
              )}
            </div>
            {selectedTests.length > 0 && (
              <p className="text-sm text-blue-600">
                {selectedTests.length} test(s) selected
              </p>
            )}
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
