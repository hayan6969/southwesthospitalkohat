import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctorPatients, useCreatePatientNote } from "@/hooks/useDoctorData";
import { Save, X } from "lucide-react";
import { toast } from "sonner";

interface PatientNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatientNoteDialog({ isOpen, onClose }: PatientNoteDialogProps) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [note, setNote] = useState('');

  const { data: doctorPatientsData, isLoading: patientsLoading } = useDoctorPatients();
  const doctorPatients = doctorPatientsData?.patients || [];
  const createNote = useCreatePatientNote();

  const handleSave = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    
    if (!note.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await createNote.mutateAsync({
        patient_id: selectedPatientId,
        notes: note.trim()
      });
      
      toast.success('Note saved successfully');
      setSelectedPatientId('');
      setNote('');
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const handleClose = () => {
    setSelectedPatientId('');
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Patient Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="patient">Select Patient</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patientsLoading ? (
                  <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                ) : doctorPatients && doctorPatients.length > 0 ? (
                  doctorPatients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.profiles?.first_name} {patient.profiles?.last_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createNote.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createNote.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}