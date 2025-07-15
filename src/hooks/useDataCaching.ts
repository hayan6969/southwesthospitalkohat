import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDataCaching = () => {
  
  const cacheDoctorsData = async () => {
    try {
      if (!navigator.onLine) return;
      
      console.log('📦 Caching doctors data...');
      const { data: doctors, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          doctors!inner (
            specialization,
            consultation_fee
          )
        `)
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (!error && doctors) {
        const processedDoctors = doctors.map(doctor => ({
          id: doctor.id,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialization: doctor.doctors?.specialization || '',
          consultation_fee: doctor.doctors?.consultation_fee || 0
        }));
        
        localStorage.setItem('cached_doctors', JSON.stringify(processedDoctors));
        console.log('✅ Doctors data cached successfully');
      }
    } catch (error) {
      console.error('Error caching doctors data:', error);
    }
  };

  const cacheLabTestsData = async () => {
    try {
      if (!navigator.onLine) return;
      
      console.log('📦 Caching lab tests data...');
      const { data: labTests, error } = await supabase
        .from('lab_tests')
        .select('id, name, price, category')
        .order('name');

      if (!error && labTests) {
        localStorage.setItem('cached_lab_tests', JSON.stringify(labTests));
        console.log('✅ Lab tests data cached successfully');
      }
    } catch (error) {
      console.error('Error caching lab tests data:', error);
    }
  };

  const cacheOTOperationsData = async () => {
    try {
      if (!navigator.onLine) return;
      
      console.log('📦 Caching OT operations data...');
      const { data: operations, error } = await supabase
        .from('ot_operations')
        .select('id, operation_name')
        .order('operation_name');

      if (!error && operations) {
        localStorage.setItem('cached_ot_operations', JSON.stringify(operations));
        console.log('✅ OT operations data cached successfully');
      }
    } catch (error) {
      console.error('Error caching OT operations data:', error);
    }
  };

  const initializeDataCaching = async () => {
    if (!navigator.onLine) {
      console.log('📱 Offline - skipping data caching');
      return;
    }

    await Promise.all([
      cacheDoctorsData(),
      cacheLabTestsData(),
      cacheOTOperationsData()
    ]);
  };

  useEffect(() => {
    // Cache data on mount
    initializeDataCaching();

    // Set up periodic caching
    const interval = setInterval(() => {
      if (navigator.onLine) {
        initializeDataCaching();
      }
    }, 30 * 60 * 1000); // Cache every 30 minutes

    // Listen for online events to cache data
    const handleOnline = () => {
      setTimeout(initializeDataCaching, 1000); // Small delay to ensure connection is stable
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    cacheDoctorsData,
    cacheLabTestsData,
    cacheOTOperationsData,
    initializeDataCaching
  };
};