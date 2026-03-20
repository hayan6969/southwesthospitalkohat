
import { useState, useEffect } from "react";
import { useCreateAppointment, useDoctors } from "@/hooks/useDatabase";
import { useDoctorAvailability, useCheckDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchablePatientSelect } from "@/components/SearchablePatientSelect";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { getCurrentPakistanDate, getCurrentPakistanTimeString, formatDateForDisplay, formatTimeForDisplay } from "@/utils/timezone";

const appointmentTypes = [
  "Consultation",
  "Follow-up",
  "Check-up",
  "Emergency",
  "Routine Visit",
  "Specialist Referral",
  "Preventive Care"
];

export function AppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  // doctorOpen removed - using Select
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");

  const createAppointment = useCreateAppointment();
  const { data: doctors } = useDoctors();
  const { logAction } = useAuditLogger();
  const { checkAvailability } = useCheckDoctorAvailability();
  const { data: availability } = useDoctorAvailability(doctorId, appointmentDate);

  // Set current date and time when dialog opens using Pakistani timezone
  useEffect(() => {
    if (open) {
      setAppointmentDate(getCurrentPakistanDate());
      setAppointmentTime(getCurrentPakistanTimeString());
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !type.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check doctor availability
    try {
      const availabilityCheck = await checkAvailability(doctorId, appointmentDate);
      
      if (!availabilityCheck.canBook) {
        if (!availabilityCheck.isAvailable) {
          toast.error("This doctor is not available on the selected date");
          return;
        }
        if (!availabilityCheck.isAcceptingAppointments) {
          toast.error("This doctor is not accepting appointments for the selected date");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      toast.error("Failed to check doctor availability");
      return;
    }

    const fullDateTime = `${appointmentDate}T${appointmentTime}:00`;

    try {
      const newAppointment = await createAppointment.mutateAsync({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: fullDateTime,
        type: type.trim(),
        notes: notes.trim() || undefined,
        status: 'scheduled'
      });
      
      // Log the audit event
      await logAction(
        "Created appointment",
        `Appointment scheduled for ${appointmentDate} at ${appointmentTime}`
      );
      
      toast.success("Appointment created successfully");
      setOpen(false);
      
      // Reset form
      setPatientId("");
      setDoctorId("");
      // doctorOpen removed
      setAppointmentDate("");
      setAppointmentTime("");
      setType("");
      setNotes("");
    } catch (error) {
      toast.error("Failed to create appointment");
      console.error("Error creating appointment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <SearchablePatientSelect
              patients={patients}
              patientNames={patientNames}
              value={patientId}
              onValueChange={setPatientId}
              placeholder="Search by patient ID or name..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select doctor..." />
              </SelectTrigger>
              <SelectContent portal={false} className="z-[9999] max-h-[300px] bg-popover">
                {doctors?.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {(doctor as any).profiles?.first_name} {(doctor as any).profiles?.last_name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((appointmentType) => (
                  <SelectItem key={appointmentType} value={appointmentType}>
                    {appointmentType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <Label className="text-sm font-medium">Scheduled for:</Label>
            <div className="text-sm text-muted-foreground">
              <div>{appointmentDate && appointmentTime ? 
                `${formatDateForDisplay(appointmentDate)} at ${formatTimeForDisplay(`2000-01-01T${appointmentTime}:00`)}` : 
                'No date/time selected'
              }</div>
              <div className="text-xs mt-1">Using Pakistani date and time</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                createAppointment.isPending || 
                (availability && !availability.canBook)
              }
            >
              {createAppointment.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
