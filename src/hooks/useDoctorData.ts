import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Hook to get patients who have had appointments with the current doctor
export const useDoctorPatients = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['doctor-patients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          patients (
            *,
            profiles (first_name, last_name, email, phone)
          )
        `)
        .eq('doctor_id', profile.id)
        .not('patients', 'is', null);

      if (error) throw error;

      // Get unique patients
      const uniquePatientsMap = new Map();
      data?.forEach(appointment => {
        if (appointment.patients && !uniquePatientsMap.has(appointment.patient_id)) {
          uniquePatientsMap.set(appointment.patient_id, appointment.patients);
        }
      });

      return Array.from(uniquePatientsMap.values());
    },
    enabled: !!profile?.id
  });
};

// Hook to get doctor's appointments for today
export const useDoctorTodayAppointments = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['doctor-today-appointments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            *,
            profiles (first_name, last_name, email, phone)
          )
        `)
        .eq('doctor_id', profile.id)
        .gte('appointment_date', `${today}T00:00:00`)
        .lt('appointment_date', `${today}T23:59:59`)
        .eq('status', 'scheduled')
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
  });
};

// Hook to get patient's appointment history with the doctor
export const usePatientAppointmentHistory = (patientId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['patient-appointment-history', patientId, profile?.id],
    queryFn: async () => {
      if (!patientId || !profile?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', profile.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId && !!profile?.id
  });
};

// Hook to get patient's medical records with the doctor
export const usePatientMedicalRecords = (patientId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['patient-medical-records', patientId, profile?.id],
    queryFn: async () => {
      if (!patientId || !profile?.id) return [];
      
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', profile.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId && !!profile?.id
  });
};

// Hook to create/update medical record
export const useCreateUpdateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      patient_id: string;
      diagnosis?: string;
      treatment?: string;
      prescription?: string;
      notes?: string;
    }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      let doctorId = profile.id;
      
      // Check if user is actually a doctor in the doctors table
      if (profile.role === 'doctor') {
        const { data: doctorExists, error: doctorCheckError } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', profile.id)
          .maybeSingle();
        
        if (doctorCheckError) {
          console.error('Error checking doctor existence:', doctorCheckError);
          throw new Error('Failed to verify doctor credentials');
        }
        
        if (!doctorExists) {
          throw new Error('Doctor profile not found. Please contact admin to set up your doctor profile.');
        }
        
        doctorId = profile.id;
      } else if (profile.role === 'admin') {
        // Get the first available doctor from the system
        const { data: doctors, error } = await supabase
          .from('doctors')
          .select('id')
          .limit(1);
        
        if (error) throw new Error('Failed to fetch doctors');
        
        if (doctors && doctors.length > 0) {
          doctorId = doctors[0].id;
        } else {
          throw new Error('No doctors available in the system. Cannot create medical records.');
        }
      } else {
        throw new Error('Only doctors and admins can create medical records');
      }
      
      if (record.id) {
        // Update existing record
        const recordData = {
          ...record,
          doctor_id: doctorId,
        };
        
        const { data, error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', record.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new record - exclude id to let database generate it
        const { id, ...recordWithoutId } = record;
        const recordData = {
          ...recordWithoutId,
          doctor_id: doctorId,
          visit_date: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('medical_records')
          .insert([recordData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-medical-records', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
  });
};

// Hook for patient notes specific to doctor-patient relationship
export const usePatientNotes = (patientId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['patient-notes', patientId, profile?.id],
    queryFn: async () => {
      if (!patientId || !profile?.id) return [];
      
      // Allow both doctors and admins to view notes
      let query = supabase
        .from('medical_records')
        .select('id, notes, visit_date, created_at')
        .eq('patient_id', patientId)
        .not('notes', 'is', null)
        .neq('notes', '');
      
      // If user is doctor, filter by doctor_id, if admin show all notes for the patient
      if (profile.role === 'doctor') {
        query = query.eq('doctor_id', profile.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId && !!profile?.id
  });
};

// Hook to create a standalone patient note
export const useCreatePatientNote = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ patient_id, notes }: { patient_id: string; notes: string }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      if (!notes.trim()) throw new Error('Note content is required');
      
      let doctorId = profile.id;
      
      // Check if user is actually a doctor in the doctors table
      if (profile.role === 'doctor') {
        const { data: doctorExists, error: doctorCheckError } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', profile.id)
          .maybeSingle();
        
        if (doctorCheckError) {
          console.error('Error checking doctor existence:', doctorCheckError);
          throw new Error('Failed to verify doctor credentials');
        }
        
        if (!doctorExists) {
          throw new Error('Doctor profile not found. Please contact admin to set up your doctor profile.');
        }
        
        doctorId = profile.id;
      } else if (profile.role === 'admin') {
        // Get the first available doctor from the system
        const { data: doctors, error } = await supabase
          .from('doctors')
          .select('id')
          .limit(1);
        
        if (error) throw new Error('Failed to fetch doctors');
        
        if (doctors && doctors.length > 0) {
          doctorId = doctors[0].id;
        } else {
          throw new Error('No doctors available in the system. Cannot create patient notes.');
        }
      } else {
        throw new Error('Only doctors and admins can create patient notes');
      }
      
      const { data, error } = await supabase
        .from('medical_records')
        .insert([{
          patient_id,
          doctor_id: doctorId,
          notes,
          visit_date: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-notes', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['patient-medical-records', data.patient_id] });
    },
  });
};

// Hook to get patient lab reports
export const usePatientLabReports = (patientId?: string) => {
  return useQuery({
    queryKey: ['patient-lab-reports', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          *,
          doctor:doctors(*, profiles(first_name, last_name))
        `)
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });
};

// Hook to get patient documents
export const usePatientDocuments = (patientId?: string) => {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });
};

// Hook to get patient prescriptions
export const usePatientPrescriptions = (patientId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['patient-prescriptions', patientId, profile?.id],
    queryFn: async () => {
      if (!patientId || !profile?.id) return [];
      
      // Allow both doctors and admins to view prescriptions
      const { data: prescriptionsData, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId);

      if (error) throw error;

      // Get doctor names separately to avoid complex joins
      const doctorIds = [...new Set(prescriptionsData?.map(p => p.doctor_id).filter(Boolean))];
      let doctorProfiles: any[] = [];
      
      if (doctorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', doctorIds);
        
        if (!profilesError) {
          doctorProfiles = profiles || [];
        }
      }

      // Merge doctor profile data with prescriptions
      const prescriptionsWithDoctors = prescriptionsData?.map(prescription => ({
        ...prescription,
        doctor_profile: doctorProfiles.find(profile => profile.id === prescription.doctor_id)
      })) || [];
      
      // If user is doctor, filter by doctor_id, if admin show all prescriptions for the patient
      if (profile.role === 'doctor') {
        const filteredPrescriptions = prescriptionsWithDoctors.filter(p => p.doctor_id === profile.id);
        return filteredPrescriptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
      return prescriptionsWithDoctors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!patientId && !!profile?.id
  });
};