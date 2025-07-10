import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function StopAppointmentsButton() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isAcceptingAppointments, setIsAcceptingAppointments] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Check current status
  useEffect(() => {
    const checkTodayStatus = async () => {
      if (!profile?.id) return;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('doctor_daily_status')
        .select('accepting_appointments')
        .eq('doctor_id', profile.id)
        .eq('status_date', today)
        .single();

      if (data) {
        setIsAcceptingAppointments(data.accepting_appointments);
      }
    };

    checkTodayStatus();
  }, [profile?.id]);

  const toggleAppointmentStatus = async () => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const newStatus = !isAcceptingAppointments;
    
    try {
      const { error } = await supabase
        .from('doctor_daily_status')
        .upsert({
          doctor_id: profile.id,
          status_date: today,
          accepting_appointments: newStatus
        }, {
          onConflict: 'doctor_id, status_date'
        });

      if (error) throw error;

      setIsAcceptingAppointments(newStatus);

      toast({
        title: newStatus ? "Appointments Resumed" : "Appointments Stopped",
        description: newStatus 
          ? "You are now accepting new appointments for today" 
          : "You have stopped accepting new appointments for today",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={toggleAppointmentStatus}
      disabled={isLoading}
      variant={isAcceptingAppointments ? "destructive" : "default"}
      className="flex items-center gap-2"
    >
      {isAcceptingAppointments ? (
        <>
          <AlertCircle className="w-4 h-4" />
          Stop Appointments Today
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          Resume Appointments
        </>
      )}
    </Button>
  );
}