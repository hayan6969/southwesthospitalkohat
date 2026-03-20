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

export const useHospitalSettings = (enabled = true) => {
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [loading, setLoading] = useState(enabled);

  const fetchSettings = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hospital_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching hospital settings:", error);
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
      if (settings?.id) {
        const { error } = await supabase
          .from("hospital_settings")
          .update(updates)
          .eq("id", settings.id);

        if (error) throw error;

        setSettings({ ...settings, ...updates });
      } else {
        const newSettings = {
          hospital_name: "City General Hospital",
          contact_number: "+92-XXX-XXXXXXX",
          hospital_address: "123 Main Street, City Center",
          opening_time: "08:00:00",
          closing_time: "20:00:00",
          working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          max_appointments_per_doctor: 50,
          booking_lead_time_hours: 2,
          emergency_slots_percentage: 20,
          payroll_payment_date: 1,
          emergency_consultation_fee: 10000,
          ...updates,
        };

        const { data, error } = await supabase
          .from("hospital_settings")
          .insert(newSettings)
          .select()
          .single();

        if (error) throw error;

        setSettings(data);
      }

      toast({
        title: "Success",
        description: "Hospital settings updated successfully",
      });
      return true;
    } catch (error) {
      console.error("Error updating hospital settings:", error);
      toast({
        title: "Error",
        description: "Failed to update hospital settings",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchSettings();
  }, [enabled]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
