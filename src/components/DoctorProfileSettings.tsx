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
import { Camera, Upload, Clock, Calendar, X, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PrescriptionTemplate {
  show_token?: boolean;
  show_fee?: boolean;
  show_clinical_record?: boolean;
  show_signature?: boolean;
  show_stamp?: boolean;
  show_footer?: boolean;
  show_doctor_photo?: boolean;
  show_hospital_logo?: boolean;
  show_watermark?: boolean;
  show_patient_address?: boolean;
  show_cnic?: boolean;
}

interface DoctorProfile {
  specialization: string;
  consultation_fee: number;
  license_number: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  phone: string;
  prescription_template: PrescriptionTemplate;
  clinic_name: string;
  clinic_short_name: string;
  qualifications: string;
  title: string;
  doctor_details: string[];
  urdu_doctor_name: string;
  urdu_details: string[];
  address: string;
  signature_url: string;
  stamp_url: string;
  header_logo: string;
}

export const DoctorProfileSettings = () => {
  const { profile } = useAuth();

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const getDefaultWorkingHours = () => {
    const defaultHours: {[key: number]: {start_time: string, end_time: string, is_working: boolean}} = {};
    daysOfWeek.forEach(day => {
      defaultHours[day.value] = { start_time: '09:00', end_time: '17:00', is_working: true };
    });
    return defaultHours;
  };

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    specialization: '',
    consultation_fee: 0,
    license_number: '',
    avatar_url: '',
    first_name: '',
    last_name: '',
    phone: '',
    prescription_template: {},
    clinic_name: '',
    clinic_short_name: '',
    qualifications: '',
    title: '',
    doctor_details: [],
    urdu_doctor_name: '',
    urdu_details: [],
    address: '',
    signature_url: '',
    stamp_url: '',
    header_logo: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [workingHours, setWorkingHours] = useState<{[key: number]: {start_time: string, end_time: string, is_working: boolean}}>(getDefaultWorkingHours());
  const [specificSchedules, setSpecificSchedules] = useState<any[]>([]);
  const [newSpecificDate, setNewSpecificDate] = useState<string>('');
  const [newSpecificStartTime, setNewSpecificStartTime] = useState<string>('09:00');
  const [newSpecificEndTime, setNewSpecificEndTime] = useState<string>('17:00');
  const [newSpecificIsWorking, setNewSpecificIsWorking] = useState<boolean>(true);

  const [letterheadOpen, setLetterheadOpen] = useState<Record<string, boolean>>({
    clinic: true,
    doctor: true,
    urdu: true,
  });

  useEffect(() => {
    if (profile?.id) fetchDoctorProfile();
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      fetchWorkingHours();
      fetchSpecificSchedules();
    }
  }, [profile?.id]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', profile?.id)
        .maybeSingle();
      if (doctorError) throw doctorError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', profile?.id)
        .single();
      if (profileError) throw profileError;

      setDoctorProfile({
        specialization: doctorData?.specialization || '',
        consultation_fee: doctorData?.consultation_fee || 0,
        license_number: doctorData?.license_number || '',
        avatar_url: doctorData?.avatar_url || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || '',
        prescription_template: (doctorData?.prescription_template || {}) as PrescriptionTemplate,
        clinic_name: doctorData?.clinic_name || '',
        clinic_short_name: doctorData?.clinic_short_name || '',
        qualifications: doctorData?.qualifications || '',
        title: doctorData?.title || '',
        doctor_details: doctorData?.doctor_details || [],
        urdu_doctor_name: doctorData?.urdu_doctor_name || '',
        urdu_details: doctorData?.urdu_details || [],
        address: doctorData?.address || '',
        signature_url: doctorData?.signature_url || '',
        stamp_url: doctorData?.stamp_url || '',
        header_logo: doctorData?.header_logo || '',
      });
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast({ title: "Error", description: "Failed to load profile information", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      if (doctorProfile.avatar_url) {
        const oldPath = doctorProfile.avatar_url.split('/').pop();
        if (oldPath) await supabase.storage.from('doctor-avatars').remove([`${profile.id}/${oldPath}`]);
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('doctor-avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('doctor-avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('doctors').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;
      setDoctorProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: "Success", description: "Profile photo updated successfully" });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'signature_url' | 'stamp_url' | 'header_logo') => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${field}-${Date.now()}.${ext}`;
      const filePath = `${profile.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('doctor-assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('doctor-assets').getPublicUrl(filePath);
      setDoctorProfile(prev => ({ ...prev, [field]: publicUrl }));
      toast({ title: "Success", description: `${field.replace('_', ' ')} uploaded successfully` });
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      toast({ title: "Error", description: `Failed to upload ${field.replace('_', ' ')}`, variant: "destructive" });
    }
    event.target.value = '';
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: existingDoctor } = await supabase
        .from('doctors')
        .select('prescription_template')
        .eq('id', profile?.id)
        .maybeSingle();

      const existingTemplate = (existingDoctor?.prescription_template || {}) as Record<string, any>;

      const template = doctorProfile.prescription_template;
      const cleanedTemplate: Record<string, any> = { ...existingTemplate };
      cleanedTemplate.show_token = template.show_token !== false;
      cleanedTemplate.show_fee = template.show_fee !== false;
      cleanedTemplate.show_clinical_record = template.show_clinical_record !== false;
      cleanedTemplate.show_signature = template.show_signature !== false;
      cleanedTemplate.show_stamp = template.show_stamp !== false;
      cleanedTemplate.show_footer = template.show_footer !== false;
      cleanedTemplate.show_doctor_photo = template.show_doctor_photo ?? false;
      cleanedTemplate.show_hospital_logo = template.show_hospital_logo ?? false;
      cleanedTemplate.show_watermark = template.show_watermark ?? false;
      cleanedTemplate.show_patient_address = template.show_patient_address ?? false;
      cleanedTemplate.show_cnic = template.show_cnic ?? false;

      const { error: doctorError } = await supabase
        .from('doctors')
        .upsert({
          id: profile?.id,
          specialization: doctorProfile.specialization,
          consultation_fee: doctorProfile.consultation_fee,
          license_number: doctorProfile.license_number,
          avatar_url: doctorProfile.avatar_url,
          prescription_template: cleanedTemplate,
          clinic_name: doctorProfile.clinic_name || null,
          clinic_short_name: doctorProfile.clinic_short_name || null,
          qualifications: doctorProfile.qualifications || null,
          title: doctorProfile.title || null,
          doctor_details: doctorProfile.doctor_details.length ? doctorProfile.doctor_details : null,
          urdu_doctor_name: doctorProfile.urdu_doctor_name || null,
          urdu_details: doctorProfile.urdu_details.length ? doctorProfile.urdu_details : null,
          address: doctorProfile.address || null,
          signature_url: doctorProfile.signature_url || null,
          stamp_url: doctorProfile.stamp_url || null,
          header_logo: doctorProfile.header_logo || null,
        }, { onConflict: 'id' });

      if (doctorError) throw doctorError;

      const profileUpdateData: any = {
        first_name: doctorProfile.first_name,
        last_name: doctorProfile.last_name,
      };
      if (doctorProfile.phone && doctorProfile.phone.trim() !== '') {
        profileUpdateData.phone = doctorProfile.phone;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', profile?.id);
      if (profileError) throw profileError;

      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const previewData = {
      hospital: {
        name: doctorProfile.clinic_name || "Hospital Name",
        address: doctorProfile.address || "Hospital Address",
        phone: "",
      },
      doctor: {
        id: profile?.id || null,
        fullName: `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim(),
        clinicName: doctorProfile.clinic_name || null,
        qualifications: doctorProfile.qualifications || null,
        title: doctorProfile.title || null,
        doctorDetails: doctorProfile.doctor_details || null,
        urduDoctorName: doctorProfile.urdu_doctor_name || null,
        urduDetails: doctorProfile.urdu_details || null,
        signatureUrl: doctorProfile.signature_url || null,
        stampUrl: doctorProfile.stamp_url || null,
        headerLogo: doctorProfile.header_logo || null,
        consultationFee: doctorProfile.consultation_fee || null,
        prescriptionTemplate: doctorProfile.prescription_template,
      },
      patient: {
        id: "preview",
        name: "Patient Name",
        patientNumber: "PREVIEW",
        age: "35",
        gender: "Male",
      },
      appointment: {
        id: "preview",
        date: new Date().toISOString(),
        consultationFee: doctorProfile.consultation_fee || null,
      },
      prescription: {
        id: "preview",
        text: null,
        createdAt: new Date().toISOString(),
      },
    };
    localStorage.setItem("prescription_preview", JSON.stringify(previewData));
    window.open("/print/prescription/preview", "_blank");
  };

  const toggleLetterhead = (section: string) => {
    setLetterheadOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const CollapsibleHeader = ({ isOpen, title, onToggle }: { isOpen: boolean; title: string; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left font-semibold text-sm text-gray-700 mb-3 hover:text-gray-900"
    >
      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {title}
    </button>
  );

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_working_hours')
        .select('*')
        .eq('doctor_id', profile?.id);
      if (error) throw error;
      const hoursMap: {[key: number]: {start_time: string, end_time: string, is_working: boolean}} = {};
      daysOfWeek.forEach(day => {
        hoursMap[day.value] = { start_time: '09:00', end_time: '17:00', is_working: true };
      });
      data?.forEach(hour => {
        hoursMap[hour.day_of_week] = {
          start_time: hour.start_time,
          end_time: hour.end_time,
          is_working: hour.is_working,
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
    const currentDayHours = workingHours[dayOfWeek] || { start_time: '09:00', end_time: '17:00', is_working: true };
    const updatedHours = {
      ...workingHours,
      [dayOfWeek]: { ...currentDayHours, [field]: value },
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
          is_working: updatedHours[dayOfWeek].is_working,
        }, { onConflict: 'doctor_id, day_of_week' });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating working hours:', error);
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
          is_working: newSpecificIsWorking,
        }, { onConflict: 'doctor_id, specific_date' });
      if (error) throw error;
      setNewSpecificDate('');
      setNewSpecificStartTime('09:00');
      setNewSpecificEndTime('17:00');
      setNewSpecificIsWorking(true);
      fetchSpecificSchedules();
      toast({ title: "Success", description: "Specific schedule added successfully" });
    } catch (error) {
      console.error('Error adding specific schedule:', error);
      toast({ title: "Error", description: "Failed to add specific schedule", variant: "destructive" });
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
      toast({ title: "Success", description: "Specific schedule deleted successfully" });
    } catch (error) {
      console.error('Error deleting specific schedule:', error);
      toast({ title: "Error", description: "Failed to delete specific schedule", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Section 1: Personal Information ── */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your basic profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-green-200">
                <AvatarImage src={doctorProfile.avatar_url || ''} alt="Doctor Avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <AvatarFallback className="bg-green-100 text-green-700 text-2xl font-bold">
                  {doctorProfile.first_name?.[0]}{doctorProfile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                <Camera className="w-4 h-4" />
                <input id="avatar-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">JPG, PNG or JPEG. Max 5MB.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={doctorProfile.first_name} onChange={(e) => setDoctorProfile({...doctorProfile, first_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={doctorProfile.last_name} onChange={(e) => setDoctorProfile({...doctorProfile, last_name: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={doctorProfile.phone} onChange={(e) => setDoctorProfile({...doctorProfile, phone: e.target.value})} placeholder="+92-XXX-XXXXXXX" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Professional Information ── */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
          <CardDescription>Your specialization, license, and consultation fee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input id="specialization" value={doctorProfile.specialization} onChange={(e) => setDoctorProfile({...doctorProfile, specialization: e.target.value})} placeholder="e.g., Cardiology, Pediatrics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input id="license_number" value={doctorProfile.license_number} onChange={(e) => setDoctorProfile({...doctorProfile, license_number: e.target.value})} placeholder="PMDC / License #" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="consultation_fee">Consultation Fee (PKR)</Label>
            <Input id="consultation_fee" type="number" min="0" step="50" value={doctorProfile.consultation_fee} onChange={(e) => setDoctorProfile({...doctorProfile, consultation_fee: parseInt(e.target.value) || 0})} placeholder="e.g., 2000" />
            <p className="text-sm text-gray-500">This fee will be shown to patients when they book appointments with you</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Prescription Letterhead ── */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Letterhead</CardTitle>
          <CardDescription>Information displayed on the printed prescription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Clinic Info */}
          <div className="border rounded-lg p-4">
            <CollapsibleHeader isOpen={letterheadOpen.clinic} title="Clinic Information" onToggle={() => toggleLetterhead('clinic')} />
            {letterheadOpen.clinic && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_name">Clinic / Hospital Name</Label>
                    <Input id="clinic_name" value={doctorProfile.clinic_name} onChange={(e) => setDoctorProfile({...doctorProfile, clinic_name: e.target.value})} placeholder="SOUTH WEST HEALTH COMPLEX KOHAT" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic_short_name">Short Name</Label>
                    <Input id="clinic_short_name" value={doctorProfile.clinic_short_name} onChange={(e) => setDoctorProfile({...doctorProfile, clinic_short_name: e.target.value})} placeholder="SWHC" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic_address">Clinic Address</Label>
                  <Input id="clinic_address" value={doctorProfile.address} onChange={(e) => setDoctorProfile({...doctorProfile, address: e.target.value})} placeholder="Opposite Millinium Guest House, Pindi Road Kohat" />
                </div>
              </div>
            )}
          </div>

          {/* Doctor Info */}
          <div className="border rounded-lg p-4">
            <CollapsibleHeader isOpen={letterheadOpen.doctor} title="Doctor Information" onToggle={() => toggleLetterhead('doctor')} />
            {letterheadOpen.doctor && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title</Label>
                    <Input id="title" value={doctorProfile.title} onChange={(e) => setDoctorProfile({...doctorProfile, title: e.target.value})} placeholder="Consultant Physician" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Input id="qualifications" value={doctorProfile.qualifications} onChange={(e) => setDoctorProfile({...doctorProfile, qualifications: e.target.value})} placeholder="MBBS, FCPS" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_details">Credentials (one per line)</Label>
                  <Textarea id="doctor_details" value={(doctorProfile.doctor_details || []).join('\n')} onChange={(e) => setDoctorProfile({...doctorProfile, doctor_details: e.target.value.split('\n').filter(Boolean)})} placeholder="Head of Department&#10;DHQ Teaching Hospital Kohat" rows={4} />
                </div>
              </div>
            )}
          </div>

          {/* Urdu Info */}
          <div className="border rounded-lg p-4">
            <CollapsibleHeader isOpen={letterheadOpen.urdu} title="Urdu Information" onToggle={() => toggleLetterhead('urdu')} />
            {letterheadOpen.urdu && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="urdu_doctor_name">Urdu Doctor Name</Label>
                  <Input id="urdu_doctor_name" value={doctorProfile.urdu_doctor_name} onChange={(e) => setDoctorProfile({...doctorProfile, urdu_doctor_name: e.target.value})} placeholder="ڈاکٹر حیان خان" dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urdu_details">Urdu Details (one per line)</Label>
                  <Textarea id="urdu_details" value={(doctorProfile.urdu_details || []).join('\n')} onChange={(e) => setDoctorProfile({...doctorProfile, urdu_details: e.target.value.split('\n').filter(Boolean)})} placeholder="کنسلٹنٹ معالج&#10;ایم بی بی ایس، ایف سی پی ایس" rows={4} dir="rtl" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Prescription Assets ── */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Assets</CardTitle>
          <CardDescription>Upload signature, stamp, and custom header logo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Signature */}
            <div className="space-y-2">
              <Label>Signature</Label>
              <div className="border rounded-lg p-4 flex flex-col items-center gap-3 min-h-[120px] justify-center">
                {doctorProfile.signature_url ? (
                  <>
                    <img src={doctorProfile.signature_url} alt="Signature" className="h-14 object-contain" />
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'signature_url')} />
                        Change
                      </label>
                      <button type="button" onClick={() => setDoctorProfile({...doctorProfile, signature_url: ''})} className="text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">No signature uploaded</div>
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-accent cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'signature_url')} />
                      Upload
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Stamp */}
            <div className="space-y-2">
              <Label>Stamp / Seal</Label>
              <div className="border rounded-lg p-4 flex flex-col items-center gap-3 min-h-[120px] justify-center">
                {doctorProfile.stamp_url ? (
                  <>
                    <img src={doctorProfile.stamp_url} alt="Stamp" className="h-20 object-contain" />
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'stamp_url')} />
                        Change
                      </label>
                      <button type="button" onClick={() => setDoctorProfile({...doctorProfile, stamp_url: ''})} className="text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">No stamp uploaded</div>
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-accent cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'stamp_url')} />
                      Upload
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Header Logo */}
            <div className="space-y-2">
              <Label>Header Logo</Label>
              <div className="border rounded-lg p-4 flex flex-col items-center gap-3 min-h-[120px] justify-center">
                {doctorProfile.header_logo ? (
                  <>
                    <img src={doctorProfile.header_logo} alt="Header Logo" className="h-16 object-contain" />
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'header_logo')} />
                        Change
                      </label>
                      <button type="button" onClick={() => setDoctorProfile({...doctorProfile, header_logo: ''})} className="text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">Uses hospital logo</div>
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-accent cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'header_logo')} />
                      Upload
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Accepted formats: PNG, JPG. Transparent backgrounds recommended.</p>
        </CardContent>
      </Card>

      {/* ── Section 5: Prescription Options ── */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Options</CardTitle>
          <CardDescription>Choose which elements appear on the printed prescription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Switch id="show_clinical_record" checked={doctorProfile.prescription_template?.show_clinical_record !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_clinical_record: checked}})} />
              <Label htmlFor="show_clinical_record">Clinical Record</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show_token" checked={doctorProfile.prescription_template?.show_token !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_token: checked}})} />
              <Label htmlFor="show_token">Token</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show_fee" checked={doctorProfile.prescription_template?.show_fee !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_fee: checked}})} />
              <Label htmlFor="show_fee">Consultation Fee</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show_signature" checked={doctorProfile.prescription_template?.show_signature !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_signature: checked}})} />
              <Label htmlFor="show_signature">Signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show_stamp" checked={doctorProfile.prescription_template?.show_stamp !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_stamp: checked}})} />
              <Label htmlFor="show_stamp">Stamp</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show_footer" checked={doctorProfile.prescription_template?.show_footer !== false} onCheckedChange={(checked) => setDoctorProfile({...doctorProfile, prescription_template: {...doctorProfile.prescription_template, show_footer: checked}})} />
              <Label htmlFor="show_footer">Footer</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Working Hours ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Weekly Working Hours</CardTitle>
          <CardDescription>Set your regular working hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map(day => (
            <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-24 font-medium">{day.label}</div>
              <Switch checked={workingHours[day.value]?.is_working || false} onCheckedChange={(checked) => handleWorkingHoursUpdate(day.value, 'is_working', checked)} />
              {workingHours[day.value]?.is_working ? (
                <>
                  <Input type="time" value={workingHours[day.value]?.start_time || '09:00'} onChange={(e) => handleWorkingHoursUpdate(day.value, 'start_time', e.target.value)} className="w-32" />
                  <span>to</span>
                  <Input type="time" value={workingHours[day.value]?.end_time || '17:00'} onChange={(e) => handleWorkingHoursUpdate(day.value, 'end_time', e.target.value)} className="w-32" />
                </>
              ) : (
                <span className="text-gray-500">Not working</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Specific Date Schedules ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Specific Date Schedules</CardTitle>
          <CardDescription>Override your regular schedule for specific dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Add Specific Date Schedule</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="specific_date">Date</Label>
                <Input id="specific_date" type="date" value={newSpecificDate} onChange={(e) => setNewSpecificDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newSpecificIsWorking} onCheckedChange={setNewSpecificIsWorking} />
                <Label>Working</Label>
              </div>
              {newSpecificIsWorking && (
                <>
                  <div>
                    <Label htmlFor="specific_start">Start Time</Label>
                    <Input id="specific_start" type="time" value={newSpecificStartTime} onChange={(e) => setNewSpecificStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="specific_end">End Time</Label>
                    <Input id="specific_end" type="time" value={newSpecificEndTime} onChange={(e) => setNewSpecificEndTime(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <Button onClick={handleAddSpecificSchedule} className="mt-3" disabled={!newSpecificDate}>Add Schedule</Button>
          </div>
          {specificSchedules.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Existing Specific Schedules</h4>
              {specificSchedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{schedule.specific_date}</span>
                    {schedule.is_working ? (
                      <span className="text-green-600">{schedule.start_time} - {schedule.end_time}</span>
                    ) : (
                      <span className="text-red-600">Not working</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSpecificSchedule(schedule.id)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="outline" onClick={handlePreview} className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview Prescription
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
