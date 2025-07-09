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
        .single();

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
    if (!settings) return false;

    try {
      const { error } = await supabase
        .from('hospital_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: "Success",
        description: "Hospital settings updated successfully",
      });
      return true;
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