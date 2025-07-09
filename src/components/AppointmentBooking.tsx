import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, DollarSign, User, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  specialization: string;
  consultation_fee: number;
  experience_years: number;
  avatar_url: string;
  first_name: string;
  last_name: string;
}

interface HospitalSettings {
  opening_time: string;
  closing_time: string;
  working_days: string[];
  max_appointments_per_doctor: number;
  booking_lead_time_hours: number;
}

export const AppointmentBooking = () => {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [doctorComboOpen, setDoctorComboOpen] = useState(false);
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchHospitalSettings();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          specialization,
          consultation_fee,
          experience_years,
          avatar_url
        `);

      if (error) throw error;

      // Get profile data separately to avoid relationship conflicts
      const doctorIds = data.map(d => d.id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', doctorIds);

      if (profilesError) throw profilesError;

      const formattedDoctors = data.map(doctor => {
        const profile = profiles.find(p => p.id === doctor.id);
        return {
          ...doctor,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || ''
        };
      });

      setDoctors(formattedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors list",
        variant: "destructive",
      });
    }
  };

  const fetchHospitalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setHospitalSettings(data);
    } catch (error) {
      console.error('Error fetching hospital settings:', error);
    }
  };

  const isDateAvailable = (date: Date) => {
    if (!hospitalSettings) return false;
    
    const dayName = format(date, 'EEEE');
    const isWorkingDay = hospitalSettings.working_days.includes(dayName);
    const isNotPast = date >= new Date();
    
    return isWorkingDay && isNotPast;
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !appointmentType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Set appointment time to hospital opening time (queue-based system)
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = hospitalSettings?.opening_time.split(':') || ['08', '00'];
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: profile?.id,
          doctor_id: selectedDoctor,
          appointment_date: appointmentDateTime.toISOString(),
          type: appointmentType,
          notes: notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment booked successfully! You will be notified of your queue position.",
      });

      // Reset form
      setSelectedDoctor("");
      setSelectedDate(undefined);
      setAppointmentType("");
      setNotes("");

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctorDetails = doctors.find(d => d.id === selectedDoctor);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Book New Appointment</CardTitle>
            <CardDescription>
              Select a doctor and preferred date for your appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctor">Select Doctor</Label>
              <Popover open={doctorComboOpen} onOpenChange={setDoctorComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={doctorComboOpen}
                    className="w-full justify-between"
                  >
                    {selectedDoctor
                      ? (() => {
                          const doctor = doctors.find(d => d.id === selectedDoctor);
                          return doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "Select doctor...";
                        })()
                      : "Select doctor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search doctors by name or specialization..." />
                    <CommandList>
                      <CommandEmpty>No doctor found.</CommandEmpty>
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor.id}
                            value={`${doctor.first_name} ${doctor.last_name} ${doctor.specialization}`}
                            onSelect={() => {
                              setSelectedDoctor(doctor.id);
                              setDoctorComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDoctor === doctor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-3 py-2">
                              <Avatar className="w-10 h-10 border-2 border-green-200">
                                <AvatarImage src={doctor.avatar_url} alt="Doctor Avatar" />
                                <AvatarFallback className="bg-green-100 text-green-700 text-sm font-bold">
                                  {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    Dr. {doctor.first_name} {doctor.last_name}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {doctor.specialization} • {doctor.experience_years} years exp.
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                  PKR {doctor.consultation_fee} consultation fee
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Appointment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDateAvailable(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select appointment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">General Consultation</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="checkup">Regular Checkup</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Describe your symptoms or concerns..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleBookAppointment} 
              className="w-full"
              disabled={loading || !selectedDoctor || !selectedDate || !appointmentType}
            >
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedDoctorDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Selected Doctor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-4 border-green-200">
                    <AvatarImage src={selectedDoctorDetails.avatar_url} alt="Doctor Avatar" />
                    <AvatarFallback className="bg-green-100 text-green-700 text-xl font-bold">
                      {selectedDoctorDetails.first_name?.[0]}{selectedDoctorDetails.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      Dr. {selectedDoctorDetails.first_name} {selectedDoctorDetails.last_name}
                    </h3>
                    <p className="text-gray-600">{selectedDoctorDetails.specialization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedDoctorDetails.experience_years} years exp.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>PKR {selectedDoctorDetails.consultation_fee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Queue-Based System</p>
                  <p className="text-gray-600">
                    Appointments are managed through a queue system. You'll receive your queue position after booking.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarIcon className="w-4 h-4 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium">Hospital Timings</p>
                  <p className="text-gray-600">
                    {hospitalSettings?.opening_time} - {hospitalSettings?.closing_time}
                  </p>
                  <p className="text-gray-600">
                    Working Days: {hospitalSettings?.working_days.join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};