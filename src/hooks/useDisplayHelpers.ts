import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Helper hook to get patient names from profiles table (with offline support)
export const usePatientNames = () => {
  return useQuery({
    queryKey: ['patient-names'],
    queryFn: async () => {
      // If offline, return cached data
      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cached_patient_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }

      try {
        // Fetch all patients without limit to ensure we get everyone
        let allPatients: any[] = [];
        let start = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone, email, created_at')
            .eq('role', 'patient')
            .range(start, start + batchSize - 1)
            .order('created_at', { ascending: true });

          if (error) throw error;
          
          if (data && data.length > 0) {
            allPatients = [...allPatients, ...data];
            start += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        const data = allPatients;
        
        // Cache the data for offline use
        if (data) {
          localStorage.setItem('cached_patient_names', JSON.stringify(data));
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching patient names:', error);
        // Fallback to cached data
        const cachedData = localStorage.getItem('cached_patient_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }
    },
    retry: false,
  });
};

// Helper hook to get doctor names from profiles table (with offline support)
export const useDoctorNames = () => {
  return useQuery({
    queryKey: ['doctor-names'],
    queryFn: async () => {
      // If offline, return cached data
      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cached_doctor_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }

      try {
        // Fetch only doctors that exist in both profiles AND doctors table
        const { data, error } = await supabase
          .from('doctors')
          .select('id, profiles!inner(first_name, last_name, phone, email)')
          .eq('profiles.role', 'doctor');

        if (error) throw error;
        
        // Flatten the data structure to match the expected format
        const formattedData = data?.map(doctor => ({
          id: doctor.id,
          first_name: doctor.profiles.first_name,
          last_name: doctor.profiles.last_name,
          phone: doctor.profiles.phone,
          email: doctor.profiles.email,
        })) || [];
        
        // Cache the data for offline use
        if (formattedData) {
          localStorage.setItem('cached_doctor_names', JSON.stringify(formattedData));
        }
        
        return formattedData;
      } catch (error) {
        console.error('Error fetching doctor names:', error);
        // Fallback to cached data
        const cachedData = localStorage.getItem('cached_doctor_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }
    },
    retry: false,
  });
};

// Helper hook to search patients by Patient ID with profile info (with offline support)
export const useSearchPatientsWithNames = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-patients-patient-id', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      // If offline, search in cached data
      if (!navigator.onLine) {
        const cachedPatients = localStorage.getItem('cached_patients');
        if (cachedPatients) {
          const patients = JSON.parse(cachedPatients);
          return patients.filter((patient: any) => 
            patient.patient_number?.toLowerCase().includes(searchTerm.toLowerCase())
          ).slice(0, 10);
        }
        return [];
      }
      
      try {
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
        const combinedData = patients.map(patient => {
          const profile = profiles?.find(p => p.id === patient.id);
          return {
            ...patient,
            profile: profile || null
          };
        });
        
        // Cache the data for offline use (update existing cache)
        const existingCache = localStorage.getItem('cached_patients');
        let cachedPatients = existingCache ? JSON.parse(existingCache) : [];
        
        // Add new patients to cache (avoid duplicates)
        combinedData.forEach(newPatient => {
          const existingIndex = cachedPatients.findIndex((p: any) => p.id === newPatient.id);
          if (existingIndex >= 0) {
            cachedPatients[existingIndex] = newPatient;
          } else {
            cachedPatients.push(newPatient);
          }
        });
        
        // Keep cache reasonable size (last 100 patients)
        if (cachedPatients.length > 100) {
          cachedPatients = cachedPatients.slice(-100);
        }
        
        localStorage.setItem('cached_patients', JSON.stringify(cachedPatients));
        
        return combinedData;
      } catch (error) {
        console.error('Error searching patients:', error);
        // Fallback to cached data on error
        const cachedPatients = localStorage.getItem('cached_patients');
        if (cachedPatients) {
          const patients = JSON.parse(cachedPatients);
          return patients.filter((patient: any) => 
            patient.patient_number?.toLowerCase().includes(searchTerm.toLowerCase())
          ).slice(0, 10);
        }
        return [];
      }
    },
    enabled: !!searchTerm && searchTerm.length >= 1,
    retry: false, // Don't retry on offline
    staleTime: 0,
    gcTime: 0,
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