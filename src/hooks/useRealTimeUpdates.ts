import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🚀 Setting up real-time updates...');
    // Create a single channel for all real-time updates
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments'
        },
        () => {
          // Invalidate related queries when appointments change
          console.log('🔄 Real-time: Appointments updated, invalidating queries...');
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
          queryClient.invalidateQueries({ queryKey: ['doctor-today-appointments'] });
          // Force immediate refetch for appointments
          queryClient.refetchQueries({ queryKey: ['appointments'] });
          queryClient.refetchQueries({ queryKey: ['doctor-today-appointments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        () => {
          // Invalidate related queries when patients change
          queryClient.invalidateQueries({ queryKey: ['patients'] });
          queryClient.invalidateQueries({ queryKey: ['patient-names'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctors'
        },
        () => {
          // Invalidate related queries when doctors change
          queryClient.invalidateQueries({ queryKey: ['doctors'] });
          queryClient.invalidateQueries({ queryKey: ['doctor-names'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => {
          // Invalidate related queries when invoices change
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medicines'
        },
        () => {
          // Invalidate related queries when medicines change
          queryClient.invalidateQueries({ queryKey: ['medicines'] });
          queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
          queryClient.invalidateQueries({ queryKey: ['expiring-medicines'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pharmacy_invoices'
        },
        () => {
          // Invalidate related queries when pharmacy invoices change
          queryClient.invalidateQueries({ queryKey: ['pharmacy-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pharmacy_invoice_items'
        },
        () => {
          // Invalidate related queries when pharmacy invoice items change
          queryClient.invalidateQueries({ queryKey: ['pharmacy-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
          queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          // Invalidate related queries when audit logs change
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ot_schedules'
        },
        () => {
          // Invalidate related queries when OT schedules change
          queryClient.invalidateQueries({ queryKey: ['ot-schedules'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_positions'
        },
        () => {
          // Invalidate related queries when queue positions change
          console.log('🔄 Real-time: Queue positions updated, invalidating queries...');
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['queue-positions'] });
          // Force immediate refetch for appointments
          queryClient.refetchQueries({ queryKey: ['appointments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_reports'
        },
        () => {
          // Invalidate related queries when lab reports change
          queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Invalidate related queries when profiles change
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
          queryClient.invalidateQueries({ queryKey: ['doctor-names'] });
          queryClient.invalidateQueries({ queryKey: ['patient-names'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time channel status:', status);
      });

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      console.log('🔌 Cleaning up real-time channel...');
      supabase.removeChannel(channel);
    };
  }, []); // Remove queryClient dependency to prevent re-subscriptions

  return null; // This hook doesn't return anything, it just sets up subscriptions
};