import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, User, Phone } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractPhoneFromEmail } from "@/utils/patientUtils";

interface PatientData {
  date_of_birth: string | null;
  blood_type: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  cnic: string | null;
}

const bloodTypes = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
];

export function PatientSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData>({
    date_of_birth: null,
    blood_type: null,
    allergies: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    address: null,
    cnic: null,
  });
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();

  // Extract phone from email if available
  const extractedPhone = profile?.email ? extractPhoneFromEmail(profile.email) : null;

  useEffect(() => {
    if (profile?.id) {
      fetchPatientData();
    }
  }, [profile?.id]);

  const fetchPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', profile?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching patient data:', error);
        return;
      }

      if (data) {
        setPatientData(data);
        if (data.date_of_birth) {
          setDateOfBirth(new Date(data.date_of_birth));
        }
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const updateData = {
        ...patientData,
        date_of_birth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : null,
        // Auto-fill emergency contact phone with extracted phone if not provided
        emergency_contact_phone: patientData.emergency_contact_phone || extractedPhone,
      };

      const { error } = await supabase
        .from('patients')
        .upsert({ 
          id: profile.id, 
          ...updateData 
        }, { 
          onConflict: 'id' 
        });

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating patient data:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5" />
        <h2 className="text-xl sm:text-2xl font-bold">Patient Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Blood Type */}
            <div className="space-y-2">
              <Label htmlFor="blood-type">Blood Type</Label>
              <Select 
                value={patientData.blood_type || ""} 
                onValueChange={(value) => setPatientData({ ...patientData, blood_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {bloodTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CNIC */}
            <div className="space-y-2">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                placeholder="e.g., 12345-1234567-1"
                value={patientData.cnic || ""}
                onChange={(e) => setPatientData({ ...patientData, cnic: e.target.value })}
              />
            </div>

            {/* System Phone (Read-only display) */}
            {extractedPhone && (
              <div className="space-y-2">
                <Label>System Phone Number</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{extractedPhone}</span>
                  <span className="text-xs text-muted-foreground">(from email)</span>
                </div>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter your complete address"
              value={patientData.address || ""}
              onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
              rows={3}
            />
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              placeholder="List any allergies or medications you're allergic to"
              value={patientData.allergies || ""}
              onChange={(e) => setPatientData({ ...patientData, allergies: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency-name">Emergency Contact Name</Label>
              <Input
                id="emergency-name"
                placeholder="Full name of emergency contact"
                value={patientData.emergency_contact_name || ""}
                onChange={(e) => setPatientData({ ...patientData, emergency_contact_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
              <Input
                id="emergency-phone"
                placeholder={extractedPhone ? `e.g., ${extractedPhone}` : "Phone number"}
                value={patientData.emergency_contact_phone || ""}
                onChange={(e) => setPatientData({ ...patientData, emergency_contact_phone: e.target.value })}
              />
              {extractedPhone && !patientData.emergency_contact_phone && (
                <p className="text-xs text-muted-foreground">
                  We'll use your system phone ({extractedPhone}) if no emergency contact is provided
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}