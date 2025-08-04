import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPkrAmount } from "@/utils/currency";
import { SearchablePatientSelect } from "@/components/SearchablePatientSelect";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { XrayOrderConfirmationDialog } from "./XrayOrderConfirmationDialog";

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
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [xrayDate, setXrayDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [externalDoctorName, setExternalDoctorName] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const queryClient = useQueryClient();
  const { logCreate } = useAuditLogger();

  // Use custom hooks for patient and doctor names
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();

  // Fetch X-ray tests
  const { data: xrayTests } = useQuery({
    queryKey: ["xray-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xray_tests")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as XrayTest[];
    },
  });

  // Fetch patients for validation
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .eq("role", "patient");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId || selectedTests.length === 0 || !xrayDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!doctorId && !externalDoctorName.trim()) {
      toast.error("Please select a doctor or enter external doctor name");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    try {
      for (const testId of selectedTests) {
        const test = xrayTests?.find(t => t.id === testId);
        if (!test) continue;

        await createXrayReport.mutateAsync({
          patient_id: patientId,
          doctor_id: doctorId || null,
          test_id: testId,
          test_name: test.name,
          xray_date: new Date(xrayDate).toISOString(),
          status: 'pending',
          price: test.price,
          notes: notes.trim() || null,
          external_doctor_name: externalDoctorName.trim() || null,
        });

        await logCreate("xray_report", `X-ray scheduled: ${test.name} for patient ${patientId}`);
      }

      toast.success(`${selectedTests.length} X-ray examination(s) scheduled successfully`);
      
      // Reset form
      setPatientId("");
      setDoctorId("");
      setSelectedTests([]);
      setXrayDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setExternalDoctorName("");
      setShowConfirmation(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating X-ray reports:", error);
      toast.error("Failed to schedule X-ray examinations");
    }
  };

  const resetForm = () => {
    setPatientId("");
    setDoctorId("");
    setSelectedTests([]);
    setXrayDate(new Date().toISOString().split('T')[0]);
    setNotes("");
    setExternalDoctorName("");
  };

  const getConfirmationData = () => {
    const patient = patients?.find(p => p.id === patientId);
    const doctor = doctors?.find(d => d.id === doctorId);
    const selectedTestsData = xrayTests?.filter(test => selectedTests.includes(test.id)) || [];
    const totalAmount = selectedTestsData.reduce((sum, test) => sum + test.price, 0);

    return {
      patient: {
        name: patient ? `${patient.first_name} ${patient.last_name}` : '',
        phone: patient?.phone || ''
      },
      doctorName: doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : externalDoctorName,
      selectedTests: selectedTestsData,
      totalAmount,
      notes: notes.trim(),
      xrayDate: new Date(xrayDate).toLocaleDateString()
    };
  };

  const totalAmount = xrayTests
    ?.filter(test => selectedTests.includes(test.id))
    .reduce((sum, test) => sum + test.price, 0) || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule X-ray Examination</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient">Patient *</Label>
                  <SearchablePatientSelect
                    patients={patients}
                    patientNames={patientNames}
                    value={patientId}
                    onValueChange={setPatientId}
                  />
                </div>

                <div>
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

                <div>
                  <Label htmlFor="external-doctor">External Doctor Name</Label>
                  <Input
                    id="external-doctor"
                    value={externalDoctorName}
                    onChange={(e) => setExternalDoctorName(e.target.value)}
                    placeholder="Enter external doctor name (if not from our hospital)"
                    disabled={!!doctorId}
                  />
                </div>

                <div>
                  <Label htmlFor="xray-date">X-ray Date *</Label>
                  <Input
                    id="xray-date"
                    type="date"
                    value={xrayDate}
                    onChange={(e) => setXrayDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Selected X-ray Tests ({selectedTests.length})</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                    {selectedTests.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tests selected</p>
                    ) : (
                      <div className="space-y-2">
                        {xrayTests?.filter(test => selectedTests.includes(test.id)).map((test) => (
                          <div key={test.id} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{test.name}</span>
                            <span className="text-sm">{formatPkrAmount(test.price)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center font-semibold">
                            <span>Total:</span>
                            <span>{formatPkrAmount(totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes or instructions..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Available X-ray Tests *</Label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4">
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createXrayReport.isPending}>
                {createXrayReport.isPending ? "Scheduling..." : "Schedule X-ray"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <XrayOrderConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        confirmationData={getConfirmationData()}
        onConfirm={handleConfirmOrder}
        isProcessing={createXrayReport.isPending}
      />
    </>
  );
}