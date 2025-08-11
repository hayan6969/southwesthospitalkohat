import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCurrentPakistanDate, getCurrentPakistanTimeString } from "@/utils/timezone";

interface AddAssessmentEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otScheduleId: string;
  onEntryAdded: () => void;
}

export function AddAssessmentEntryDialog({
  open,
  onOpenChange,
  otScheduleId,
  onEntryAdded,
}: AddAssessmentEntryDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    entry_date: getCurrentPakistanDate(),
    entry_time: getCurrentPakistanTimeString(),
    assessment: '',
    plan: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_entries')
        .insert({
          ot_schedule_id: otScheduleId,
          entry_date: formData.entry_date,
          entry_time: formData.entry_time,
          assessment: formData.assessment,
          plan: formData.plan,
          user_email: profile.email,
        });

      if (error) throw error;

      onEntryAdded();
      setFormData({
        entry_date: getCurrentPakistanDate(),
        entry_time: getCurrentPakistanTimeString(),
        assessment: '',
        plan: '',
      });
    } catch (error) {
      console.error('Error adding assessment entry:', error);
      toast({
        title: "Error",
        description: "Failed to add assessment entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Assessment Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_time">Time</Label>
              <Input
                id="entry_time"
                type="time"
                value={formData.entry_time}
                onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment">Assessment</Label>
            <Textarea
              id="assessment"
              placeholder="Enter assessment details..."
              value={formData.assessment}
              onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Textarea
              id="plan"
              placeholder="Enter plan details..."
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}