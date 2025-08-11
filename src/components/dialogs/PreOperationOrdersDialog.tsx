import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, Save, Eye } from "lucide-react";

interface PreOperationOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otSchedule: {
    id: string;
    patient_id: string;
    doctor_id: string;
    operation_date: string;
    patient: {
      patient_number: string;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
    operation: {
      operation_name: string;
    };
    doctor_name: string;
    ot_notes?: {
      pre_operation_orders?: string;
    };
  } | null;
  onSave?: () => void;
}

export function PreOperationOrdersDialog({ 
  open, 
  onOpenChange, 
  otSchedule, 
  onSave 
}: PreOperationOrdersDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [preOpOrders, setPreOpOrders] = useState("");

  // Check if user can edit (only doctors)
  const canEdit = profile?.role === 'doctor';
  // OTA and staff can view (staff includes nursing staff)
  const canView = profile?.role === 'ota' || profile?.role === 'staff' || canEdit;

  useEffect(() => {
    if (otSchedule?.ot_notes?.pre_operation_orders) {
      setPreOpOrders(otSchedule.ot_notes.pre_operation_orders);
    } else {
      setPreOpOrders("");
    }
  }, [otSchedule]);

  const handleSave = async () => {
    if (!otSchedule || !canEdit) return;

    setSaving(true);
    try {
      // Get existing ot_notes or create new structure
      const existingNotes = otSchedule.ot_notes || {};
      
      // Update the ot_notes with pre_operation_orders
      const updatedNotes = {
        ...existingNotes,
        pre_operation_orders: preOpOrders
      };

      const { error } = await supabase
        .from('ot_schedules')
        .update({ 
          ot_notes: updatedNotes
        })
        .eq('id', otSchedule.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pre-operation orders saved successfully",
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving pre-operation orders:', error);
      toast({
        title: "Error",
        description: "Failed to save pre-operation orders",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!otSchedule || !canView) {
    console.log('PreOperationOrdersDialog: Not rendering dialog', { otSchedule: !!otSchedule, canView, profileRole: profile?.role });
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Pre-Operation Orders
            {!canEdit && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (View Only)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Patient and Operation Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Patient:</span>
                <div className="text-gray-900">
                  {otSchedule.patient.profile.first_name} {otSchedule.patient.profile.last_name}
                </div>
                <div className="text-gray-600 text-xs">
                  ID: {otSchedule.patient.patient_number}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Operation:</span>
                <div className="text-gray-900">{otSchedule.operation.operation_name}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <div className="text-gray-900">
                  {format(new Date(otSchedule.operation_date), 'PPP')}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Surgeon:</span>
                <div className="text-gray-900">{otSchedule.doctor_name}</div>
              </div>
            </div>
          </div>

          {/* Pre-Operation Orders */}
          <div className="space-y-3">
            <Label htmlFor="preOpOrders" className="text-base font-semibold">
              Pre-Operation Orders
            </Label>
            <Textarea
              id="preOpOrders"
              value={preOpOrders}
              onChange={(e) => setPreOpOrders(e.target.value)}
              placeholder={canEdit ? 
                "Enter pre-operation orders, instructions, medications, preparations, etc." :
                "No pre-operation orders available"
              }
              className="min-h-[200px] resize-none"
              readOnly={!canEdit}
            />
            {canEdit && (
              <p className="text-xs text-gray-500">
                These orders will be visible to OTA and nursing staff for operation preparation.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Orders'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}