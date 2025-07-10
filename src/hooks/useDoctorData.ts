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
      
      // For admin users or doctors, allow creating medical records
      // Admin users can act on behalf of doctors for record management
      let doctorId = profile.id;
      
      // If user is admin, try to find a doctor ID or use the profile ID
      if (profile.role === 'admin') {
        // For now, allow admins to create records using their profile ID
        // In a real system, you might want to select a specific doctor
        doctorId = profile.id;
      }
      
      const recordData = {
        ...record,
        doctor_id: doctorId,
        visit_date: record.id ? undefined : new Date().toISOString()
      };

      if (record.id) {
        // Update existing record
        const { data, error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', record.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new record
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
      
      // If user is admin, allow creating notes using their profile ID
      if (profile.role === 'admin') {
        doctorId = profile.id;
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