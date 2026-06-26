import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HospitalSettings {
  id: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  max_appointments_per_doctor: number;
  booking_lead_time_hours: number;
  emergency_slots_percentage: number;
  hospital_name: string;
  contact_number: string;
  hospital_address: string;
  logo_url?: string;
  payroll_payment_date?: number;
  emergency_consultation_fee?: number;
}

export const useHospitalSettings = () => {
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hospital_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching hospital settings:', error);
      toast({
        title: "Error",
        description: "Failed to load hospital settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<HospitalSettings>) => {
    try {
      // First, try to get existing settings to check if we need to update or insert
      const { data: existing, error: fetchError } = await supabase
        .from('hospital_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let result;
      if (existing?.id) {
        // Update existing settings
        const { data, error } = await supabase
          .from('hospital_settings')
          .update(updates)
          .eq('id', existing.id)
          .select();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new settings with defaults
        const newSettings = {
          hospital_name: updates.hospital_name || 'City General Hospital',
          contact_number: updates.contact_number || '+92-XXX-XXXXXXX',
          hospital_address: updates.hospital_address || '123 Main Street, City Center',
          opening_time: '08:00:00',
          closing_time: '20:00:00',
          working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          max_appointments_per_doctor: 50,
          booking_lead_time_hours: 2,
          emergency_slots_percentage: 20,
          payroll_payment_date: 1,
          emergency_consultation_fee: 10000,
          ...updates
        };
        
        const { data, error } = await supabase
          .from('hospital_settings')
          .insert(newSettings)
          .select();
        
        if (error) throw error;
        result = data;
      }

      if (result?.length) {
        setSettings(result[0]);
        toast({
          title: "Success",
          description: "Hospital settings updated successfully",
        });
        return true;
      } else {
        throw new Error('No data returned from update');
      }
    } catch (error) {
      console.error('Error updating hospital settings:', error);
      toast({
        title: "Error",
        description: "Failed to update hospital settings",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings
  };
};