import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface OTNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otSchedule: {
    id: string;
    patient_id: string;
    doctor_id: string;
    operation_date: string;
    patient: {
      profile: {
        first_name: string;
        last_name: string;
        date_of_birth?: string;
      };
    };
    operation: {
      operation_name: string;
    };
    doctor_name: string;
    ot_notes?: {
      patient_name: string;
      age: string;
      sex: string;
      operation_datetime: string;
      diagnosis: string;
      procedure: string;
      surgeon_name: string;
      anesthetist_name: string;
      post_op_orders: string;
    };
  } | null;
  onSave?: () => void;
  readOnly?: boolean;
}

export function OTNotesDialog({ open, onOpenChange, otSchedule, onSave, readOnly = false }: OTNotesDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [operationDateTime, setOperationDateTime] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [procedure, setProcedure] = useState("");
  const [surgeonName, setSurgeonName] = useState("");
  const [anesthetistName, setAnesthetistName] = useState("");
  const [postOpOrders, setPostOpOrders] = useState("");

  useEffect(() => {
    if (otSchedule && open) {
      // Auto-fill patient name
      const fullName = `${otSchedule.patient.profile.first_name} ${otSchedule.patient.profile.last_name}`;
      setPatientName(otSchedule.ot_notes?.patient_name || fullName);
      
      // Set default operation date/time to current date/time
      const defaultDateTime = new Date().toISOString().slice(0, 16);
      setOperationDateTime(otSchedule.ot_notes?.operation_datetime || defaultDateTime);
      
      // Set procedure from operation
      setProcedure(otSchedule.ot_notes?.procedure || otSchedule.operation.operation_name);
      
      // Set surgeon name from doctor
      setSurgeonName(otSchedule.ot_notes?.surgeon_name || otSchedule.doctor_name);
      
      // Load existing notes if available
      setAge(otSchedule.ot_notes?.age || "");
      setSex(otSchedule.ot_notes?.sex || "");
      setDiagnosis(otSchedule.ot_notes?.diagnosis || "");
      setAnesthetistName(otSchedule.ot_notes?.anesthetist_name || "");
      setPostOpOrders(otSchedule.ot_notes?.post_op_orders || "");
    }
  }, [otSchedule, open]);

  const handleSave = async () => {
    if (!otSchedule) return;

    setSaving(true);
    try {
      const notesData = {
        patient_name: patientName,
        age: age,
        sex: sex,
        operation_datetime: operationDateTime,
        diagnosis,
        procedure,
        surgeon_name: surgeonName,
        anesthetist_name: anesthetistName,
        post_op_orders: postOpOrders
      };

      const { error } = await supabase
        .from("ot_schedules")
        .update({ 
          ot_notes: notesData as any
        })
        .eq("id", otSchedule.id);

      if (error) throw error;

      toast({
        title: "OT Notes Saved",
        description: "Operation notes have been saved successfully",
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving OT notes:", error);
      toast({
        title: "Error",
        description: "Failed to save OT notes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!otSchedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? 'View ' : ''}OT Notes - {otSchedule.operation.operation_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patient_name">Name of Patient</Label>
            <Input
              id="patient_name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient name"
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g., 45"
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <Input
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              placeholder="e.g., M or F"
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operation_datetime">Date/Time of Operation</Label>
            <Input
              id="operation_datetime"
              type="datetime-local"
              value={operationDateTime}
              onChange={(e) => setOperationDateTime(e.target.value)}
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis"
              rows={3}
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="procedure">Procedure</Label>
            <Textarea
              id="procedure"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="Enter procedure details"
              rows={3}
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surgeon_name">Name of Surgeon</Label>
            <Input
              id="surgeon_name"
              value={surgeonName}
              onChange={(e) => setSurgeonName(e.target.value)}
              placeholder="Surgeon name"
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anesthetist_name">Name of Anesthetist</Label>
            <Input
              id="anesthetist_name"
              value={anesthetistName}
              onChange={(e) => setAnesthetistName(e.target.value)}
              placeholder="Anesthetist name"
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="post_op_orders">Post Operation Orders</Label>
            <Textarea
              id="post_op_orders"
              value={postOpOrders}
              onChange={(e) => setPostOpOrders(e.target.value)}
              placeholder="Enter post-operation orders and instructions"
              rows={4}
              readOnly={readOnly}
              className={readOnly ? "cursor-default text-foreground bg-background" : ""}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}