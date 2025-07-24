import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateDischargeSlipPDF } from "@/utils/dischargeSlipPdfGenerator";

interface DischargeSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otSchedule: any;
  onDischarge: () => void;
}

export function DischargeSlipDialog({ open, onOpenChange, otSchedule, onDischarge }: DischargeSlipDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    ageSex: "",
    address: "",
    roomNo: "",
    dateOfAdmission: "",
    dateOfOperation: "",
    dateOfDischarge: "",
    consultant: "",
    diagnosis: "",
    operation: "",
    hospitalTreatment: "",
    homeTreatment: ""
  });

  useEffect(() => {
    if (otSchedule && open) {
      console.log('OT Schedule data for discharge:', otSchedule);
      const otNotes = otSchedule.ot_notes || {};
      console.log('OT Notes:', otNotes);
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate age from patient data if available, or use from OT notes
      let ageSex = otNotes.age_sex || "";
      if (!ageSex && otSchedule.patient?.date_of_birth) {
        const birthDate = new Date(otSchedule.patient.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        ageSex = `${age} years`;
      }
      
      // Use created_at as admission date (when OT was scheduled)
      const admissionDate = otSchedule.created_at ? new Date(otSchedule.created_at).toISOString().split('T')[0] : "";
      
      setFormData({
        name: otNotes.patient_name || `${otSchedule.patient?.profile?.first_name || ''} ${otSchedule.patient?.profile?.last_name || ''}`.trim(),
        ageSex: ageSex,
        address: otSchedule.patient?.address || "",
        roomNo: otSchedule.room?.room_name || "",
        dateOfAdmission: admissionDate,
        dateOfOperation: otSchedule.operation_date || "",
        dateOfDischarge: today,
        consultant: otNotes.surgeon_name || otSchedule.doctor_name || "",
        diagnosis: otNotes.diagnosis || "",
        operation: otNotes.procedure || otSchedule.operation?.operation_name || "",
        hospitalTreatment: otNotes.post_op_orders || "",
        homeTreatment: ""
      });
      
      console.log('Form data set:', {
        name: otNotes.patient_name || `${otSchedule.patient?.profile?.first_name || ''} ${otSchedule.patient?.profile?.last_name || ''}`.trim(),
        ageSex: ageSex,
        address: otSchedule.patient?.address || "",
        roomNo: otSchedule.room?.room_name || "",
        dateOfAdmission: admissionDate,
        dateOfOperation: otSchedule.operation_date || "",
        dateOfDischarge: today,
        consultant: otNotes.surgeon_name || otSchedule.doctor_name || "",
        diagnosis: otNotes.diagnosis || "",
        operation: otNotes.procedure || otSchedule.operation?.operation_name || "",
        hospitalTreatment: otNotes.post_op_orders || "",
        homeTreatment: ""
      });
    }
  }, [otSchedule, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmDischarge = async () => {
    try {
      // Update OT schedule status to completed
      const { error } = await supabase
        .from("ot_schedules")
        .update({ 
          status: 'completed',
          ot_notes: {
            ...otSchedule.ot_notes,
            dischargeSlip: formData
          }
        })
        .eq("id", otSchedule.id);

      if (error) throw error;

      // Generate PDF
      await generateDischargeSlipPDF(formData);

      toast({
        title: "Patient Discharged",
        description: "Discharge slip generated successfully",
      });

      onDischarge();
      onOpenChange(false);
    } catch (error) {
      console.error("Error discharging patient:", error);
      toast({
        title: "Error",
        description: "Failed to discharge patient",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discharge Slip</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ageSex">Age/Sex</Label>
            <Input
              id="ageSex"
              value={formData.ageSex}
              onChange={(e) => handleInputChange("ageSex", e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roomNo">Room No</Label>
            <Input
              id="roomNo"
              value={formData.roomNo}
              onChange={(e) => handleInputChange("roomNo", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfAdmission">Date of Admission</Label>
            <Input
              id="dateOfAdmission"
              type="date"
              value={formData.dateOfAdmission}
              onChange={(e) => handleInputChange("dateOfAdmission", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfOperation">Date of Operation</Label>
            <Input
              id="dateOfOperation"
              type="date"
              value={formData.dateOfOperation}
              onChange={(e) => handleInputChange("dateOfOperation", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfDischarge">Date of Discharge</Label>
            <Input
              id="dateOfDischarge"
              type="date"
              value={formData.dateOfDischarge}
              onChange={(e) => handleInputChange("dateOfDischarge", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="consultant">Consultant</Label>
            <Input
              id="consultant"
              value={formData.consultant}
              onChange={(e) => handleInputChange("consultant", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange("diagnosis", e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operation">Operation</Label>
            <Input
              id="operation"
              value={formData.operation}
              onChange={(e) => handleInputChange("operation", e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="hospitalTreatment">Hospital Treatment</Label>
            <Textarea
              id="hospitalTreatment"
              rows={6}
              value={formData.hospitalTreatment}
              onChange={(e) => handleInputChange("hospitalTreatment", e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="homeTreatment">Home Treatment</Label>
            <Textarea
              id="homeTreatment"
              rows={6}
              value={formData.homeTreatment}
              onChange={(e) => handleInputChange("homeTreatment", e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>Confirm Discharge</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Discharge</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to discharge this patient? This action will mark the operation as completed and generate a discharge slip.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDischarge}>
                  Yes, Discharge Patient
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}