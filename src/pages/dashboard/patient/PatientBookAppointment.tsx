import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Stethoscope, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrCurrency } from "@/utils/currency";

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
  experience_years: number;
}

interface HospitalSettings {
  opening_time: string;
  closing_time: string;
  working_days: string[];
}

const APPOINTMENT_TYPES = [
  "General Consultation",
  "Follow-up",
  "Urgent Care",
  "Preventive Care",
  "Specialist Consultation"
];

export default function PatientBookAppointment() {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDoctors();
    loadHospitalSettings();
  }, []);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          consultation_fee,
          specialization,
          experience_years,
          profiles!inner(first_name, last_name, is_active)
        `)
        .eq('profiles.is_active', true);

      if (error) throw error;

      const formattedDoctors = data?.map(doctor => ({
        id: doctor.id,
        first_name: doctor.profiles.first_name,
        last_name: doctor.profiles.last_name,
        specialization: doctor.specialization || 'General Medicine',
        consultation_fee: doctor.consultation_fee || 0,
        experience_years: doctor.experience_years || 0
      })) || [];

      setDoctors(formattedDoctors);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error("Failed to load doctors");
    }
  };

  const loadHospitalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_settings')
        .select('opening_time, closing_time, working_days')
        .maybeSingle();

      if (error) throw error;
      setHospitalSettings(data);
    } catch (error) {
      console.error('Error loading hospital settings:', error);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const isValidAppointmentDate = (dateString: string) => {
    if (!hospitalSettings) return true;
    
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    return hospitalSettings.working_days.includes(dayOfWeek);
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !appointmentDate || !appointmentType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isValidAppointmentDate(appointmentDate)) {
      toast.error("Selected date is not a working day");
      return;
    }

    setLoading(true);
    try {
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: profile?.id,
          doctor_id: selectedDoctor,
          appointment_date: new Date(appointmentDate).toISOString(),
          type: appointmentType,
          notes: notes || null,
          status: 'scheduled'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Calculate queue position
      const { data: queueData, error: queueError } = await supabase
        .rpc('calculate_queue_position', {
          p_appointment_id: appointment.id,
          p_doctor_id: selectedDoctor,
          p_appointment_date: appointmentDate
        });

      if (queueError) throw queueError;

      // Insert into queue_positions
      const { error: queueInsertError } = await supabase
        .from('queue_positions')
        .insert({
          appointment_id: appointment.id,
          queue_number: queueData,
          estimated_time: null // Will be calculated based on queue
        });

      if (queueInsertError) throw queueInsertError;

      toast.success(`Appointment booked successfully! Your queue number is ${queueData}`);
      
      // Reset form
      setSelectedDoctor("");
      setAppointmentDate("");
      setAppointmentType("");
      setNotes("");
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error("Failed to book appointment");
    }
    setLoading(false);
  };

  const selectedDoctorInfo = doctors.find(d => d.id === selectedDoctor);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Book New Appointment</h2>
        <p className="text-gray-600">Schedule your appointment with our qualified doctors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment Details
              </CardTitle>
              <CardDescription>
                Fill in the details for your appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="doctor">Select Doctor</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-medium">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doctor.specialization} • {formatPkrCurrency(doctor.consultation_fee)}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Appointment Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={getMinDate()}
                />
                {hospitalSettings && (
                  <p className="text-sm text-gray-500 mt-1">
                    Working days: {hospitalSettings.working_days.map(day => 
                      day.charAt(0).toUpperCase() + day.slice(1)
                    ).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Appointment Type</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific symptoms or concerns..."
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={bookAppointment} 
                disabled={loading || !selectedDoctor || !appointmentDate || !appointmentType}
                className="w-full"
              >
                {loading ? "Booking..." : "Book Appointment"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedDoctorInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Doctor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">
                    Dr. {selectedDoctorInfo.first_name} {selectedDoctorInfo.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedDoctorInfo.specialization}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{selectedDoctorInfo.experience_years} years experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Consultation Fee: {formatPkrCurrency(selectedDoctorInfo.consultation_fee)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Queue-Based System</h4>
                  <p className="text-sm text-gray-600">
                    Our hospital uses a queue-based appointment system. You will be assigned a queue number 
                    and can track your position in real-time.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {hospitalSettings && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Hospital Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Opening Time:</span>
                    <span className="text-sm font-medium">{hospitalSettings.opening_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Closing Time:</span>
                    <span className="text-sm font-medium">{hospitalSettings.closing_time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}