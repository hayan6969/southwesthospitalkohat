import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, User, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DoctorScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string | null;
  doctorName: string;
}

interface WorkingHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface SpecificSchedule {
  id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
  notes?: string;
}

interface DoctorStatus {
  accepting_appointments: boolean;
  status_date: string;
}

export function DoctorScheduleDialog({ 
  isOpen, 
  onClose, 
  doctorId, 
  doctorName 
}: DoctorScheduleDialogProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [specificSchedules, setSpecificSchedules] = useState<SpecificSchedule[]>([]);
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchDoctorSchedule();
    }
  }, [isOpen, doctorId]);

  const fetchDoctorSchedule = async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Fetch working hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('doctor_working_hours')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week');

      if (hoursError) throw hoursError;

      // Fetch specific schedules (only future ones)
      const today = new Date().toISOString().split('T')[0];
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('doctor_specific_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('specific_date', today)
        .order('specific_date');

      if (schedulesError) throw schedulesError;

      // Fetch current doctor status
      const { data: statusData, error: statusError } = await supabase
        .from('doctor_daily_status')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status_date', today)
        .maybeSingle();

      if (statusError && statusError.code !== 'PGRST116') throw statusError;

      setWorkingHours(hoursData || []);
      setSpecificSchedules(schedulesData || []);
      setDoctorStatus(statusData);
    } catch (error) {
      console.error('Error fetching doctor schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkingHoursForDay = (dayOfWeek: number) => {
    return workingHours.find(wh => wh.day_of_week === dayOfWeek);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dr. {doctorName} - Schedule
          </DialogTitle>
          <DialogDescription>
            View doctor's working hours and specific date schedules
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Today's Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={doctorStatus?.accepting_appointments !== false ? "default" : "destructive"}
                    className={doctorStatus?.accepting_appointments !== false ? "bg-green-100 text-green-700" : ""}
                  >
                    {doctorStatus?.accepting_appointments !== false ? "Accepting Appointments" : "Not Accepting Appointments"}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(), 'MMMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Weekly Working Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {daysOfWeek.map(day => {
                    const hours = getWorkingHoursForDay(day.value);
                    return (
                      <div key={day.value} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="font-medium w-24">{day.label}</div>
                        {hours?.is_working ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {formatTime(hours.start_time)} - {formatTime(hours.end_time)}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Not Working
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Specific Date Schedules */}
            {specificSchedules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Specific Date Schedules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {specificSchedules.map(schedule => (
                      <div key={schedule.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {format(new Date(schedule.specific_date), 'MMMM d, yyyy')}
                            </span>
                            {schedule.is_working ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-700">
                                Not Working
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(schedule.specific_date), 'eeee')}
                          </div>
                        </div>
                        {schedule.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            Note: {schedule.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Schedule Information */}
            {workingHours.length === 0 && specificSchedules.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Set</h3>
                  <p className="text-gray-500">
                    This doctor has not set their working hours yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}