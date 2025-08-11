import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save } from "lucide-react";
import { getCurrentPakistanTimeString } from "@/utils/timezone";

interface AddTreatmentEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otScheduleId: string;
  onSave: () => void;
}

export function AddTreatmentEntryDialog({ 
  open, 
  onOpenChange, 
  otScheduleId,
  onSave 
}: AddTreatmentEntryDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    entryDate: new Date(),
    entryTime: getCurrentPakistanTimeString(),
    medicine: "",
    investigation: ""
  });

  const handleSave = async () => {
    if (!profile?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('treatment_chart_entries')
        .insert({
          ot_schedule_id: otScheduleId,
          entry_date: formData.entryDate.toISOString().split('T')[0],
          medicine: formData.medicine,
          investigation: formData.investigation,
          user_email: profile.email
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Treatment entry added successfully",
      });

      // Reset form
      setFormData({
        entryDate: new Date(),
        entryTime: getCurrentPakistanTimeString(),
        medicine: "",
        investigation: ""
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving treatment entry:', error);
      toast({
        title: "Error",
        description: "Failed to add treatment entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Add Treatment Entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Date</Label>
              <DatePicker 
                date={formData.entryDate}
                onDateChange={(date) => setFormData(prev => ({ ...prev, entryDate: date || new Date() }))}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entryTime">Time</Label>
              <Input
                id="entryTime"
                type="time"
                value={formData.entryTime}
                onChange={(e) => setFormData(prev => ({ ...prev, entryTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicine">Medicine</Label>
            <Textarea
              id="medicine"
              value={formData.medicine}
              onChange={(e) => setFormData(prev => ({ ...prev, medicine: e.target.value }))}
              placeholder="Prescribed medicines and dosage"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="investigation">Investigation</Label>
            <Textarea
              id="investigation"
              value={formData.investigation}
              onChange={(e) => setFormData(prev => ({ ...prev, investigation: e.target.value }))}
              placeholder="Investigation notes and findings"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>User</Label>
            <Input
              value={profile?.email || ""}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}