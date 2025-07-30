import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generatePrescriptionPDF } from "@/utils/prescriptionPdfGenerator";
import { FileText, Pill, Loader2 } from "lucide-react";

interface PrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  patientName: string;
  patientId: string;
}

export function PrescriptionDialog({ 
  open, 
  onOpenChange, 
  appointment, 
  patientName,
  patientId
}: PrescriptionDialogProps) {
  const [prescriptionText, setPrescriptionText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveAndPrint = async () => {
    if (!prescriptionText.trim()) {
      toast({
        title: "Error",
        description: "Please enter prescription text",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // First check if prescription already exists for this appointment
      const { data: existingPrescription, error: fetchError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', appointment.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let prescriptionData;

      if (existingPrescription) {
        // Update existing prescription
        const { data, error: updateError } = await supabase
          .from('prescriptions')
          .update({
            prescription_text: prescriptionText,
            updated_at: new Date().toISOString()
          })
          .eq('appointment_id', appointment.id)
          .select()
          .single();

        if (updateError) throw updateError;
        prescriptionData = data;

        toast({
          title: "Success",
          description: "Prescription updated successfully"
        });
      } else {
        // Create new prescription
        const { data, error: insertError } = await supabase
          .from('prescriptions')
          .insert({
            appointment_id: appointment.id,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            prescription_text: prescriptionText
          })
          .select()
          .single();

        if (insertError) throw insertError;
        prescriptionData = data;

        toast({
          title: "Success",
          description: "Prescription saved successfully"
        });
      }

      // Generate and open PDF
      await generatePrescriptionPDF({
        prescriptionText,
        patientName,
        patientId,
        appointmentDate: new Date(appointment.appointment_date).toLocaleDateString(),
        doctorName: "Dr. " + (appointment.doctor?.first_name || "") + " " + (appointment.doctor?.last_name || "")
      });

      onOpenChange(false);
      setPrescriptionText("");

    } catch (error) {
      console.error('Error saving prescription:', error);
      toast({
        title: "Error",
        description: "Failed to save prescription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing prescription when dialog opens
  const loadExistingPrescription = async () => {
    if (!appointment?.id) return;

    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('prescription_text')
        .eq('appointment_id', appointment.id)
        .single();

      if (data && !error) {
        setPrescriptionText(data.prescription_text);
      }
    } catch (error) {
      // Prescription doesn't exist yet, which is fine
      console.log('No existing prescription found');
    }
  };

  // Load prescription when dialog opens
  useEffect(() => {
    if (open && appointment) {
      loadExistingPrescription();
    }
  }, [open, appointment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Write Prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Patient:</span> {patientName}
              </div>
              <div>
                <span className="font-medium">Patient ID:</span> {patientId}
              </div>
              <div>
                <span className="font-medium">Date:</span> {
                  appointment ? new Date(appointment.appointment_date).toLocaleDateString() : ''
                }
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prescription">Prescription</Label>
            <Textarea
              id="prescription"
              placeholder="Enter prescription details here..."
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndPrint}
              disabled={isLoading || !prescriptionText.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Save & Print Prescription
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}