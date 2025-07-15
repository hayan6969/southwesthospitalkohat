import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, PendingOperation } from '@/utils/offlineStorage';
import { useToast } from '@/hooks/use-toast';

export const useOfflineDataSync = () => {
  const { toast } = useToast();

  const syncPendingOperations = async () => {
    try {
      if (!navigator.onLine) {
        console.log('📱 Offline - skipping sync');
        return;
      }

      const operations = await offlineStorage.getPendingOperations();
      if (operations.length === 0) {
        console.log('✅ No pending operations to sync');
        return;
      }

      console.log(`🔄 Syncing ${operations.length} pending operations...`);

      let successCount = 0;
      let failureCount = 0;

      for (const operation of operations) {
        try {
          await syncSingleOperation(operation);
          await offlineStorage.markOperationSynced(operation.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          failureCount++;
        }
      }

      // Clean up synced operations
      if (successCount > 0) {
        await offlineStorage.deleteSyncedOperations();
        
        toast({
          title: "Sync Complete",
          description: `${successCount} operations synced successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: successCount > 0 ? "default" : "destructive"
        });
      }

    } catch (error) {
      console.error('Error during sync:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync offline data. Will retry later.",
        variant: "destructive"
      });
    }
  };

  const syncSingleOperation = async (operation: PendingOperation) => {
    console.log(`🔄 Syncing operation: ${operation.type} on ${operation.table}`);

    switch (operation.type) {
      case 'appointment':
        return await syncAppointmentOperation(operation);
      case 'create_patient_with_profile':
        return await syncPatientOperation(operation);
      case 'invoice':
        return await syncInvoiceOperation(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  };

  const syncAppointmentOperation = async (operation: PendingOperation) => {
    if (operation.table === 'appointments') {
      // First, ensure patient exists
      let patientId = operation.data.patient_id;
      
      if (operation.data.patient_name && operation.data.patient_cnic) {
        // Try to find existing patient or create one
        const patient = await findOrCreatePatient(
          operation.data.patient_name, 
          operation.data.patient_cnic
        );
        patientId = patient.id;
      }

      const appointmentData = {
        ...operation.data,
        patient_id: patientId
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } else if (operation.table === 'lab_reports') {
      // Handle lab report sync
      let patientId = operation.data.patient_id;
      
      if (operation.data.patient_name && operation.data.patient_cnic) {
        const patient = await findOrCreatePatient(
          operation.data.patient_name, 
          operation.data.patient_cnic
        );
        patientId = patient.id;
      }

      const labData = {
        ...operation.data,
        patient_id: patientId
      };

      const { data, error } = await supabase
        .from('lab_reports')
        .insert([labData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } else if (operation.table === 'ot_schedules') {
      // Handle OT schedule sync
      let patientId = operation.data.patient_id;
      
      if (operation.data.patient_name && operation.data.patient_cnic) {
        const patient = await findOrCreatePatient(
          operation.data.patient_name, 
          operation.data.patient_cnic
        );
        patientId = patient.id;
      }

      const otData = {
        ...operation.data,
        patient_id: patientId
      };

      const { data, error } = await supabase
        .from('ot_schedules')
        .insert([otData])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  const findOrCreatePatient = async (patientName: string, patientCnic: string) => {
    // First, try to find existing patient by CNIC
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('cnic', patientCnic)
      .single();

    if (existingPatient) {
      return existingPatient;
    }

    // If patient doesn't exist, create a new one
    const [firstName, ...lastNameParts] = patientName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Create patient with minimal data
    const email = `${patientCnic.replace(/-/g, '')}@offline.local`;
    
    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: patientCnic,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'patient'
        }
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    const patientId = authData?.user?.id;
    if (!patientId) {
      throw new Error('Failed to create patient account');
    }

    // Create patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        id: patientId,
        cnic: patientCnic
      })
      .select()
      .single();

    if (patientError) {
      if (patientError.code === '23505') {
        // Patient already exists, find and return it
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('cnic', patientCnic)
          .single();
        return existingPatient;
      }
      throw patientError;
    }

    return patient;
  };

  const syncPatientOperation = async (operation: PendingOperation) => {
    // Similar to findOrCreatePatient but for standalone patient creation
    return await findOrCreatePatient(
      `${operation.data.first_name} ${operation.data.last_name}`,
      operation.data.cnic
    );
  };

  const syncInvoiceOperation = async (operation: PendingOperation) => {
    const { data, error } = await supabase
      .from('invoices')
      .insert([operation.data])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  useEffect(() => {
    // Sync on mount if online
    if (navigator.onLine) {
      setTimeout(syncPendingOperations, 1000);
    }

    // Listen for online events
    const handleOnline = () => {
      setTimeout(syncPendingOperations, 2000);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    syncPendingOperations,
    syncSingleOperation
  };
};