
import { useState } from "react";
import { useCreateAppointment, useDoctors, usePatients } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useDoctorAvailability, useCheckDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");

  const createAppointment = useCreateAppointment();
  const { data: doctors } = useDoctors();
  const { data: patients } = usePatients();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const { logAction } = useAuditLogger();
  const { checkAvailability } = useCheckDoctorAvailability();
  const { data: availability } = useDoctorAvailability(doctorId, appointmentDate);

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
      setDoctorOpen(false);
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
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {getPatientName(patient.id, patientNames || [])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={doctorOpen}
                  className="w-full justify-between"
                >
                  {doctorId
                    ? `Dr. ${doctors?.find((doctor) => doctor.id === doctorId)?.profiles?.first_name} ${doctors?.find((doctor) => doctor.id === doctorId)?.profiles?.last_name}`
                    : "Select doctor..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search doctors..." />
                  <CommandList>
                    <CommandEmpty>No doctor found.</CommandEmpty>
                    <CommandGroup>
                      {doctors?.map((doctor) => (
                        <CommandItem
                          key={doctor.id}
                          value={`${doctor.profiles?.first_name} ${doctor.profiles?.last_name} ${doctor.specialization}`}
                          onSelect={() => {
                            setDoctorId(doctor.id);
                            setDoctorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              doctorId === doctor.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name} - {doctor.specialization}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
              {appointmentDate && availability && !availability.canBook && (
                <div className="text-sm text-red-600 mt-1">
                  {!availability.isAvailable && "Doctor is not available on this date"}
                  {availability.isAvailable && !availability.isAcceptingAppointments && "Doctor is not accepting appointments on this date"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Consultation, Check-up, Follow-up"
              required
            />
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
