import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const patientSearchMemoryCache = new Map<string, any[]>();

const cachePatientsForOffline = (combinedData: any[]) => {
  const existingCache = localStorage.getItem('cached_patients');
  let cachedPatients = existingCache ? JSON.parse(existingCache) : [];

  combinedData.forEach((newPatient) => {
    const existingIndex = cachedPatients.findIndex((p: any) => p.id === newPatient.id);
    if (existingIndex >= 0) {
      cachedPatients[existingIndex] = newPatient;
    } else {
      cachedPatients.push(newPatient);
    }
  });

  if (cachedPatients.length > 100) {
    cachedPatients = cachedPatients.slice(-100);
  }

  localStorage.setItem('cached_patients', JSON.stringify(cachedPatients));
};

const searchCachedPatients = (searchTerm: string) => {
  const cachedPatients = localStorage.getItem('cached_patients');
  if (!cachedPatients) return [];

  const query = searchTerm.toLowerCase();
  const patients = JSON.parse(cachedPatients);

  return patients.filter((patient: any) => {
    const name = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.toLowerCase();
    const patientNumber = (patient.patient_number || '').toLowerCase();
    const cnic = (patient.cnic || '').toLowerCase();
    const emergencyPhone = (patient.emergency_contact_phone || '').toLowerCase();
    const phone = (patient.profile?.phone || '').toLowerCase();
    const email = (patient.profile?.email || '').toLowerCase();

    return (
      name.includes(query) ||
      patientNumber.includes(query) ||
      cnic.includes(query) ||
      emergencyPhone.includes(query) ||
      phone.includes(query) ||
      email.includes(query)
    );
  }).slice(0, 10);
};

// Helper hook to get patient names from profiles table (with offline support)
export const usePatientNames = () => {
  return useQuery({
    queryKey: ['patient-names'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cached_patient_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }

      try {
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

        if (allPatients) {
          localStorage.setItem('cached_patient_names', JSON.stringify(allPatients));
        }

        return allPatients;
      } catch (error) {
        console.error('Error fetching patient names:', error);
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
      if (!navigator.onLine) {
        const cachedData = localStorage.getItem('cached_doctor_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }

      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('id, profiles!inner(first_name, last_name, phone, email)')
          .eq('profiles.role', 'doctor');

        if (error) throw error;

        const formattedData = data?.map(doctor => ({
          id: doctor.id,
          first_name: (doctor.profiles as any)?.first_name,
          last_name: (doctor.profiles as any)?.last_name,
          phone: (doctor.profiles as any)?.phone,
          email: (doctor.profiles as any)?.email,
        })) || [];

        if (formattedData) {
          localStorage.setItem('cached_doctor_names', JSON.stringify(formattedData));
        }

        return formattedData;
      } catch (error) {
        console.error('Error fetching doctor names:', error);
        const cachedData = localStorage.getItem('cached_doctor_names');
        return cachedData ? JSON.parse(cachedData) : [];
      }
    },
    retry: false,
  });
};

// Helper hook to search patients by Patient ID with profile info (with offline support)
export const useSearchPatientsWithNames = (searchTerm: string) => {
  const trimmedSearchTerm = searchTerm.trim();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(trimmedSearchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(trimmedSearchTerm);
    }, 200);

    return () => clearTimeout(timer);
  }, [trimmedSearchTerm]);

  return useQuery({
    queryKey: ['search-patients-patient-id', debouncedSearchTerm],
    queryFn: async () => {
      const term = debouncedSearchTerm.trim();
      if (term.length < 2) return [];

      const normalizedTerm = term.toLowerCase();
      const cachedResult = patientSearchMemoryCache.get(normalizedTerm);
      if (cachedResult) return cachedResult;

      if (!navigator.onLine) {
        return searchCachedPatients(term);
      }

      try {
        const safeTerm = term.replace(/[,%()]/g, ' ').trim();
        const digitsOnly = safeTerm.replace(/[^0-9]/g, '');
        const emailPhonePattern = digitsOnly ? `${digitsOnly}@patient.local` : null;

        const [patientsByNumberResponse, profileMatchesResponse] = await Promise.all([
          supabase
            .from('patients')
            .select('id, patient_number, cnic, emergency_contact_phone')
            .or(`patient_number.ilike.%${safeTerm}%,emergency_contact_phone.ilike.%${safeTerm}%,cnic.ilike.%${safeTerm}%`)
            .limit(10),
          supabase
            .from('profiles')
            .select('id, first_name, last_name, phone, email')
            .eq('role', 'patient')
            .or(`first_name.ilike.%${safeTerm}%,last_name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%${emailPhonePattern ? `,email.eq.${emailPhonePattern}` : ''}`)
            .limit(10),
        ]);

        if (patientsByNumberResponse.error) throw patientsByNumberResponse.error;
        if (profileMatchesResponse.error) throw profileMatchesResponse.error;

        const patientMap = new Map<string, any>();
        (patientsByNumberResponse.data || []).forEach((patient) => {
          patientMap.set(patient.id, patient);
        });

        const missingPatientIds = (profileMatchesResponse.data || [])
          .map((profile) => profile.id)
          .filter((id) => !patientMap.has(id));

        if (missingPatientIds.length > 0) {
          const { data: missingPatients, error: missingPatientsError } = await supabase
            .from('patients')
            .select('id, patient_number, cnic, emergency_contact_phone')
            .in('id', missingPatientIds.slice(0, 10));

          if (missingPatientsError) throw missingPatientsError;

          (missingPatients || []).forEach((patient) => {
            patientMap.set(patient.id, patient);
          });
        }

        const profileMap = new Map<string, any>();
        (profileMatchesResponse.data || []).forEach((profile) => {
          profileMap.set(profile.id, profile);
        });

        // Fetch missing profiles for patients found by patient_number but not by profile search
        const missingProfileIds = Array.from(patientMap.keys()).filter((id) => !profileMap.has(id));
        if (missingProfileIds.length > 0) {
          const { data: missingProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone, email')
            .in('id', missingProfileIds.slice(0, 10));

          (missingProfiles || []).forEach((profile) => {
            profileMap.set(profile.id, profile);
          });
        }

        const combinedData = Array.from(patientMap.values())
          .map((patient) => ({
            ...patient,
            profile: profileMap.get(patient.id) || null,
          }))
          .slice(0, 10);

        patientSearchMemoryCache.set(normalizedTerm, combinedData);
        cachePatientsForOffline(combinedData);

        return combinedData;
      } catch (error) {
        console.error('Error searching patients:', error);
        return searchCachedPatients(term);
      }
    },
    enabled: debouncedSearchTerm.length >= 2,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
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
