import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface DoctorProfile {
  specialization: string;
  consultation_fee: number;
  experience_years: number;
  license_number: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export const DoctorProfileSettings = () => {
  const { profile } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    specialization: '',
    consultation_fee: 0,
    experience_years: 0,
    license_number: '',
    first_name: '',
    last_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchDoctorProfile();
    }
  }, [profile?.id]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      
      // Get doctor-specific data
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', profile?.id)
        .single();

      if (doctorError) throw doctorError;

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', profile?.id)
        .single();

      if (profileError) throw profileError;

      setDoctorProfile({
        specialization: doctorData.specialization || '',
        consultation_fee: doctorData.consultation_fee || 0,
        experience_years: doctorData.experience_years || 0,
        license_number: doctorData.license_number || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || ''
      });
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update doctor table
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({
          specialization: doctorProfile.specialization,
          consultation_fee: doctorProfile.consultation_fee,
          experience_years: doctorProfile.experience_years,
          license_number: doctorProfile.license_number
        })
        .eq('id', profile?.id);

      if (doctorError) throw doctorError;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: doctorProfile.first_name,
          last_name: doctorProfile.last_name,
          phone: doctorProfile.phone
        })
        .eq('id', profile?.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your basic profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={doctorProfile.first_name}
                  onChange={(e) => setDoctorProfile({...doctorProfile, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={doctorProfile.last_name}
                  onChange={(e) => setDoctorProfile({...doctorProfile, last_name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={doctorProfile.phone}
                onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})}
                placeholder="+92-XXX-XXXXXXX"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>
              Update your medical practice details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={doctorProfile.specialization}
                onChange={(e) => setDoctorProfile({...doctorProfile, specialization: e.target.value})}
                placeholder="e.g., Cardiology, Pediatrics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input
                id="license_number"
                value={doctorProfile.license_number}
                onChange={(e) => setDoctorProfile({...doctorProfile, license_number: e.target.value})}
                placeholder="Medical license number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience_years">Years of Experience</Label>
              <Input
                id="experience_years"
                type="number"
                min="0"
                max="50"
                value={doctorProfile.experience_years}
                onChange={(e) => setDoctorProfile({...doctorProfile, experience_years: parseInt(e.target.value) || 0})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultation Fees</CardTitle>
          <CardDescription>
            Set your consultation fee (this will be displayed to patients when booking)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consultation_fee">Consultation Fee (PKR)</Label>
            <Input
              id="consultation_fee"
              type="number"
              min="0"
              step="50"
              value={doctorProfile.consultation_fee}
              onChange={(e) => setDoctorProfile({...doctorProfile, consultation_fee: parseInt(e.target.value) || 0})}
              placeholder="e.g., 2000"
            />
            <p className="text-sm text-gray-600">
              This fee will be shown to patients when they book appointments with you
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};