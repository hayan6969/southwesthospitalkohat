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

interface AddPostOpProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otScheduleId: string;
  onSave: () => void;
}

export function AddPostOpProgressDialog({ 
  open, 
  onOpenChange, 
  otScheduleId,
  onSave 
}: AddPostOpProgressDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    entryDate: new Date(),
    bloodPressure: "",
    pulses: "",
    temperature: "",
    input: "",
    output: "",
    remarks: ""
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
        .from('postop_progress_entries')
        .insert({
          ot_schedule_id: otScheduleId,
          entry_date: formData.entryDate.toISOString().split('T')[0],
          blood_pressure: formData.bloodPressure,
          pulses: formData.pulses,
          temperature: formData.temperature,
          input_data: formData.input,
          output_data: formData.output,
          remarks: formData.remarks,
          user_email: profile.email
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Progress entry added successfully",
      });

      // Reset form
      setFormData({
        entryDate: new Date(),
        bloodPressure: "",
        pulses: "",
        temperature: "",
        input: "",
        output: "",
        remarks: ""
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving progress entry:', error);
      toast({
        title: "Error",
        description: "Failed to add progress entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Add Progress Entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entryDate">Date</Label>
            <DatePicker 
              date={formData.entryDate}
              onDateChange={(date) => setFormData(prev => ({ ...prev, entryDate: date || new Date() }))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bloodPressure">Blood Pressure</Label>
              <Input
                id="bloodPressure"
                value={formData.bloodPressure}
                onChange={(e) => setFormData(prev => ({ ...prev, bloodPressure: e.target.value }))}
                placeholder="120/80"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pulses">Pulses</Label>
              <Input
                id="pulses"
                value={formData.pulses}
                onChange={(e) => setFormData(prev => ({ ...prev, pulses: e.target.value }))}
                placeholder="72 bpm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                value={formData.temperature}
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                placeholder="98.6°F"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="input">Input</Label>
              <Input
                id="input"
                value={formData.input}
                onChange={(e) => setFormData(prev => ({ ...prev, input: e.target.value }))}
                placeholder="Input data"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="output">Output</Label>
              <Input
                id="output"
                value={formData.output}
                onChange={(e) => setFormData(prev => ({ ...prev, output: e.target.value }))}
                placeholder="Output data"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Additional remarks"
                className="min-h-[40px]"
              />
            </div>
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