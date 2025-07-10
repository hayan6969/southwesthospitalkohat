import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AvailabilityData {
  [key: string]: boolean; // date string -> is_available
}

export function DoctorAvailabilityManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch existing availability data
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('doctor_availability')
        .select('availability_date, is_available')
        .eq('doctor_id', profile.id);

      if (data) {
        const availabilityMap: AvailabilityData = {};
        data.forEach(item => {
          availabilityMap[item.availability_date] = item.is_available;
        });
        setAvailability(availabilityMap);
      }
    };

    fetchAvailability();
  }, [profile?.id]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const toggleAvailability = async (date: Date, isAvailable: boolean) => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    const dateString = format(date, 'yyyy-MM-dd');
    
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .upsert({
          doctor_id: profile.id,
          availability_date: dateString,
          is_available: isAvailable
        }, {
          onConflict: 'doctor_id, availability_date'
        });

      if (error) throw error;

      setAvailability(prev => ({
        ...prev,
        [dateString]: isAvailable
      }));

      toast({
        title: "Availability Updated",
        description: `You are now ${isAvailable ? 'available' : 'unavailable'} on ${format(date, 'MMM d, yyyy')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDayAvailability = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return availability[dateString];
  };

  const modifiers = {
    available: (date: Date) => getDayAvailability(date) === true,
    unavailable: (date: Date) => getDayAvailability(date) === false,
  };

  const modifiersStyles = {
    available: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    unavailable: {
      backgroundColor: '#ef4444',
      color: 'white',
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Schedule Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Your Availability</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2 text-sm">
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              Available
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              Unavailable
            </Badge>
          </div>
          
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border pointer-events-auto"
            disabled={(date) => date < new Date()}
          />

          {selectedDate && (
            <div className="flex flex-col gap-2 p-4 border rounded-lg bg-gray-50">
              <p className="font-medium">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={getDayAvailability(selectedDate) === true ? "default" : "outline"}
                  onClick={() => toggleAvailability(selectedDate, true)}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Available
                </Button>
                <Button
                  size="sm"
                  variant={getDayAvailability(selectedDate) === false ? "destructive" : "outline"}
                  onClick={() => toggleAvailability(selectedDate, false)}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Unavailable
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}