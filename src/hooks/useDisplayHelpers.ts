import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Helper hook to get patient names from profiles table
export const usePatientNames = () => {
  return useQuery({
    queryKey: ['patient-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, email')
        .eq('role', 'patient');

      if (error) throw error;
      return data;
    }
  });
};

// Helper hook to get doctor names from profiles table
export const useDoctorNames = () => {
  return useQuery({
    queryKey: ['doctor-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, email')
        .eq('role', 'doctor');

      if (error) throw error;
      return data;
    }
  });
};

// Helper hook to search patients by Patient ID with profile info
export const useSearchPatientsWithNames = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-patients-patient-id', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      // Search patients by patient_number (Patient ID)
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .ilike('patient_number', `%${searchTerm}%`)
        .limit(10);

      if (patientsError) throw patientsError;
      if (!patients || patients.length === 0) return [];

      // Then get profile data for these patients
      const patientIds = patients.map(p => p.id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, email')
        .in('id', patientIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return patients.map(patient => {
        const profile = profiles?.find(p => p.id === patient.id);
        return {
          ...patient,
          profile: profile || null
        };
      });
    },
    enabled: !!searchTerm && searchTerm.length >= 1, // Live search with minimum 1 character
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data (replaced cacheTime)
  });
};

// Helper function to get patient name by ID
export const getPatientName = (patientId: string, patientNames: any[]) => {
  const patient = patientNames?.find(p => p.id === patientId);
  return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
};

// Helper function to get doctor name by ID
export const getDoctorName = (doctorId: string, doctorNames: any[]) => {
  const doctor = doctorNames?.find(d => d.id === doctorId);
  return doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Unknown Doctor';
};