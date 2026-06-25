import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Camera, Upload, Clock, Calendar, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PrescriptionTemplate {
  title_prefix?: string;
  degrees?: string;
  credentials?: string[];
  urdu_name?: string;
  urdu_lines?: string[];
  pa_phone?: string;
  footer_text?: string;
  show_token?: boolean;
  show_fee?: boolean;
  show_qr?: boolean;
}

interface DoctorProfile {
  specialization: string;
  consultation_fee: number;
  experience_years: number;
  license_number: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  phone: string;
  prescription_template: PrescriptionTemplate;
}

export const DoctorProfileSettings = () => {
  const { profile } = useAuth();
  
  // Days of week mapping
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  // Initialize working hours with default values
  const getDefaultWorkingHours = () => {
    const defaultHours: {[key: number]: {start_time: string, end_time: string, is_working: boolean}} = {};
    daysOfWeek.forEach(day => {
      defaultHours[day.value] = {
        start_time: '09:00',
        end_time: '17:00',
        is_working: true
      };
    });
    return defaultHours;
  };

  // All state declarations at the top
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    specialization: '',
    consultation_fee: 0,
    experience_years: 0,
    license_number: '',
    avatar_url: '',
    first_name: '',
    last_name: '',
    phone: '',
    prescription_template: {}
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Working hours states
  const [workingHours, setWorkingHours] = useState<{[key: number]: {start_time: string, end_time: string, is_working: boolean}}>(getDefaultWorkingHours());
  const [specificSchedules, setSpecificSchedules] = useState<any[]>([]);
  const [newSpecificDate, setNewSpecificDate] = useState<string>('');
  const [newSpecificStartTime, setNewSpecificStartTime] = useState<string>('09:00');
  const [newSpecificEndTime, setNewSpecificEndTime] = useState<string>('17:00');
  const [newSpecificIsWorking, setNewSpecificIsWorking] = useState<boolean>(true);

  // All useEffect hooks at the top
  useEffect(() => {
    if (profile?.id) {
      fetchDoctorProfile();
    }
  }, [profile?.id]);

  // Fetch working hours and specific schedules
  useEffect(() => {
    if (profile?.id) {
      fetchWorkingHours();
      fetchSpecificSchedules();
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
        .maybeSingle();

      if (doctorError) throw doctorError;

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', profile?.id)
        .single();

      if (profileError) throw profileError;

      setDoctorProfile({
        specialization: doctorData?.specialization || '',
        consultation_fee: doctorData?.consultation_fee || 0,
        experience_years: doctorData?.experience_years || 0,
        license_number: doctorData?.license_number || '',
        avatar_url: doctorData?.avatar_url || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || '',
        prescription_template: (doctorData?.prescription_template || {}) as PrescriptionTemplate
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Delete old avatar if exists
      if (doctorProfile.avatar_url) {
        const oldPath = doctorProfile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('doctor-avatars')
            .remove([`${profile.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doctor-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('doctor-avatars')
        .getPublicUrl(filePath);

      // Update doctor profile with new avatar URL
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setDoctorProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const template = doctorProfile.prescription_template;
      const cleanedTemplate: Record<string, any> = {};
      if (template.title_prefix) cleanedTemplate.title_prefix = template.title_prefix;
      if (template.degrees) cleanedTemplate.degrees = template.degrees;
      if (template.credentials?.length) cleanedTemplate.credentials = template.credentials;
      if (template.urdu_name) cleanedTemplate.urdu_name = template.urdu_name;
      if (template.urdu_lines?.length) cleanedTemplate.urdu_lines = template.urdu_lines;
      if (template.pa_phone) cleanedTemplate.pa_phone = template.pa_phone;
      if (template.footer_text) cleanedTemplate.footer_text = template.footer_text;
      cleanedTemplate.show_token = template.show_token !== false;
      cleanedTemplate.show_fee = template.show_fee !== false;
      cleanedTemplate.show_qr = template.show_qr !== false;

      const { error: doctorError } = await supabase
        .from('doctors')
        .upsert({
          id: profile?.id,
          specialization: doctorProfile.specialization,
          consultation_fee: doctorProfile.consultation_fee,
          experience_years: doctorProfile.experience_years,
          license_number: doctorProfile.license_number,
          avatar_url: doctorProfile.avatar_url,
          prescription_template: cleanedTemplate
        }, {
          onConflict: 'id'
        });

      if (doctorError) throw doctorError;

      // Prepare profile update data - only include phone if it's not empty
      const profileUpdateData: any = {
        first_name: doctorProfile.first_name,
        last_name: doctorProfile.last_name
      };

      // Only include phone in update if it's not empty to avoid constraint issues
      if (doctorProfile.phone && doctorProfile.phone.trim() !== '') {
        profileUpdateData.phone = doctorProfile.phone;
      }

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
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

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_working_hours')
        .select('*')
        .eq('doctor_id', profile?.id);

      if (error) throw error;

      const hoursMap: {[key: number]: {start_time: string, end_time: string, is_working: boolean}} = {};
      
      // Initialize with default hours for all days
      daysOfWeek.forEach(day => {
        hoursMap[day.value] = {
          start_time: '09:00',
          end_time: '17:00',
          is_working: true
        };
      });

      // Override with saved data
      data?.forEach(hour => {
        hoursMap[hour.day_of_week] = {
          start_time: hour.start_time,
          end_time: hour.end_time,
          is_working: hour.is_working
        };
      });

      setWorkingHours(hoursMap);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    }
  };

  const fetchSpecificSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_specific_schedules')
        .select('*')
        .eq('doctor_id', profile?.id)
        .order('specific_date', { ascending: true });

      if (error) throw error;
      setSpecificSchedules(data || []);
    } catch (error) {
      console.error('Error fetching specific schedules:', error);
    }
  };

  const handleWorkingHoursUpdate = async (dayOfWeek: number, field: string, value: any) => {
    // Ensure the day exists in working hours with default values
    const currentDayHours = workingHours[dayOfWeek] || {
      start_time: '09:00',
      end_time: '17:00',
      is_working: true
    };

    const updatedHours = {
      ...workingHours,
      [dayOfWeek]: {
        ...currentDayHours,
        [field]: value
      }
    };
    setWorkingHours(updatedHours);

    try {
      const { error } = await supabase
        .from('doctor_working_hours')
        .upsert({
          doctor_id: profile?.id,
          day_of_week: dayOfWeek,
          start_time: updatedHours[dayOfWeek].start_time,
          end_time: updatedHours[dayOfWeek].end_time,
          is_working: updatedHours[dayOfWeek].is_working
        }, {
          onConflict: 'doctor_id, day_of_week'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hours updated successfully",
      });
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours",
        variant: "destructive",
      });
    }
  };

  const handleAddSpecificSchedule = async () => {
    if (!newSpecificDate) return;

    try {
      const { error } = await supabase
        .from('doctor_specific_schedules')
        .upsert({
          doctor_id: profile?.id,
          specific_date: newSpecificDate,
          start_time: newSpecificStartTime,
          end_time: newSpecificEndTime,
          is_working: newSpecificIsWorking
        }, {
          onConflict: 'doctor_id, specific_date'
        });

      if (error) throw error;

      // Reset form
      setNewSpecificDate('');
      setNewSpecificStartTime('09:00');
      setNewSpecificEndTime('17:00');
      setNewSpecificIsWorking(true);

      // Refresh data
      fetchSpecificSchedules();

      toast({
        title: "Success",
        description: "Specific schedule added successfully",
      });
    } catch (error) {
      console.error('Error adding specific schedule:', error);
      toast({
        title: "Error",
        description: "Failed to add specific schedule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSpecificSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_specific_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      fetchSpecificSchedules();

      toast({
        title: "Success",
        description: "Specific schedule deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting specific schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete specific schedule",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Upload your professional profile photo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-green-200">
              <AvatarImage 
                src={doctorProfile.avatar_url || ''} 
                alt="Doctor Avatar"
                onError={(e) => {
                  console.log('Profile settings avatar failed to load:', doctorProfile.avatar_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <AvatarFallback className="bg-green-100 text-green-700 text-2xl font-bold">
                {doctorProfile.first_name?.[0]}{doctorProfile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              Dr. {doctorProfile.first_name} {doctorProfile.last_name}
            </h3>
            <p className="text-gray-600">{doctorProfile.specialization}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={uploading}
              className="mt-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Change Photo"}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG or JPEG. Max 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

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

      {/* Prescription Slip Template */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Slip Template</CardTitle>
          <CardDescription>
            Customize your letterhead that appears on every prescription slip
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title_prefix">Title Prefix</Label>
              <Input
                id="title_prefix"
                value={doctorProfile.prescription_template?.title_prefix || ''}
                onChange={(e) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, title_prefix: e.target.value }
                })}
                placeholder="e.g., Prof. Dr."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="degrees">Degrees</Label>
              <Input
                id="degrees"
                value={doctorProfile.prescription_template?.degrees || ''}
                onChange={(e) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, degrees: e.target.value }
                })}
                placeholder="MBBS, FCPS, CHPE"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credentials">Credentials (one per line)</Label>
            <Textarea
              id="credentials"
              value={(doctorProfile.prescription_template?.credentials || []).join('\n')}
              onChange={(e) => setDoctorProfile({
                ...doctorProfile,
                prescription_template: { ...doctorProfile.prescription_template, credentials: e.target.value.split('\n').filter(Boolean) }
              })}
              placeholder="Principal KMU-IMS Kohat&#10;CEO DHQ & W&amp;C/LM Teaching Hospital Kohat"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urdu_name">Urdu Name</Label>
              <Input
                id="urdu_name"
                value={doctorProfile.prescription_template?.urdu_name || ''}
                onChange={(e) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, urdu_name: e.target.value }
                })}
                placeholder="پروفیسر ڈاکٹر مسرت جبین"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa_phone">PA Phone</Label>
              <Input
                id="pa_phone"
                value={doctorProfile.prescription_template?.pa_phone || ''}
                onChange={(e) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, pa_phone: e.target.value }
                })}
                placeholder="0336-1974146"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="urdu_lines">Urdu Lines (one per line)</Label>
            <Textarea
              id="urdu_lines"
              value={(doctorProfile.prescription_template?.urdu_lines || []).join('\n')}
              onChange={(e) => setDoctorProfile({
                ...doctorProfile,
                prescription_template: { ...doctorProfile.prescription_template, urdu_lines: e.target.value.split('\n').filter(Boolean) }
              })}
              placeholder="ماہر امراض نسواں"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text</Label>
            <Input
              id="footer_text"
              value={doctorProfile.prescription_template?.footer_text || ''}
              onChange={(e) => setDoctorProfile({
                ...doctorProfile,
                prescription_template: { ...doctorProfile.prescription_template, footer_text: e.target.value }
              })}
              placeholder="NOT VALID FOR COURT"
            />
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="show_token"
                checked={doctorProfile.prescription_template?.show_token !== false}
                onCheckedChange={(checked) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, show_token: checked }
                })}
              />
              <Label htmlFor="show_token">Show Token</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show_fee"
                checked={doctorProfile.prescription_template?.show_fee !== false}
                onCheckedChange={(checked) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, show_fee: checked }
                })}
              />
              <Label htmlFor="show_fee">Show Fee</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show_qr"
                checked={doctorProfile.prescription_template?.show_qr !== false}
                onCheckedChange={(checked) => setDoctorProfile({
                  ...doctorProfile,
                  prescription_template: { ...doctorProfile.prescription_template, show_qr: checked }
                })}
              />
              <Label htmlFor="show_qr">Show QR Code</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Working Hours
          </CardTitle>
          <CardDescription>
            Set your regular working hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map(day => (
            <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-24 font-medium">{day.label}</div>
              <Switch
                checked={workingHours[day.value]?.is_working || false}
                onCheckedChange={(checked) => handleWorkingHoursUpdate(day.value, 'is_working', checked)}
              />
              {workingHours[day.value]?.is_working && (
                <>
                  <Input
                    type="time"
                    value={workingHours[day.value]?.start_time || '09:00'}
                    onChange={(e) => handleWorkingHoursUpdate(day.value, 'start_time', e.target.value)}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={workingHours[day.value]?.end_time || '17:00'}
                    onChange={(e) => handleWorkingHoursUpdate(day.value, 'end_time', e.target.value)}
                    className="w-32"
                  />
                </>
              )}
              {!workingHours[day.value]?.is_working && (
                <span className="text-gray-500">Not working</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Specific Date Schedules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Specific Date Schedules
          </CardTitle>
          <CardDescription>
            Override your regular schedule for specific dates (holidays, special hours, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new specific schedule */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Add Specific Date Schedule</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="specific_date">Date</Label>
                <Input
                  id="specific_date"
                  type="date"
                  value={newSpecificDate}
                  onChange={(e) => setNewSpecificDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newSpecificIsWorking}
                  onCheckedChange={setNewSpecificIsWorking}
                />
                <Label>Working</Label>
              </div>
              {newSpecificIsWorking && (
                <>
                  <div>
                    <Label htmlFor="specific_start">Start Time</Label>
                    <Input
                      id="specific_start"
                      type="time"
                      value={newSpecificStartTime}
                      onChange={(e) => setNewSpecificStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specific_end">End Time</Label>
                    <Input
                      id="specific_end"
                      type="time"
                      value={newSpecificEndTime}
                      onChange={(e) => setNewSpecificEndTime(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <Button 
              onClick={handleAddSpecificSchedule}
              className="mt-3"
              disabled={!newSpecificDate}
            >
              Add Schedule
            </Button>
          </div>

          {/* List existing specific schedules */}
          {specificSchedules.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Existing Specific Schedules</h4>
              {specificSchedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{schedule.specific_date}</span>
                    {schedule.is_working ? (
                      <span className="text-green-600">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                    ) : (
                      <span className="text-red-600">Not working</span>
                    )}
                    {schedule.notes && (
                      <span className="text-gray-500 text-sm">({schedule.notes})</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSpecificSchedule(schedule.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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