import { Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { format } from "date-fns";

export const HospitalTimingCard = () => {
  const { settings: hospitalSettings, loading } = useHospitalSettings();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Hospital Timings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hospitalSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Hospital Timings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Hospital timing information not available</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timeString: string) => {
    try {
      // Parse time string (format: HH:mm:ss)
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  const isOpenToday = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return hospitalSettings.working_days?.includes(today) || false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Hospital Timings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hospital Name */}
        <div>
          <h4 className="font-semibold text-lg">{hospitalSettings.hospital_name}</h4>
          {hospitalSettings.hospital_address && (
            <p className="text-sm text-gray-600">{hospitalSettings.hospital_address}</p>
          )}
          {hospitalSettings.contact_number && (
            <p className="text-sm text-gray-600">📞 {hospitalSettings.contact_number}</p>
          )}
        </div>

        {/* Opening Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Opening Hours:</span>
            <Badge variant={isOpenToday() ? "default" : "secondary"}>
              {isOpenToday() ? "Open Today" : "Closed Today"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>
              {formatTime(hospitalSettings.opening_time)} - {formatTime(hospitalSettings.closing_time)}
            </span>
          </div>
        </div>

        {/* Working Days */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Working Days:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {hospitalSettings.working_days?.map((day) => (
              <Badge 
                key={day} 
                variant={day === new Date().toLocaleDateString('en-US', { weekday: 'long' }) ? "default" : "outline"}
                className="text-xs"
              >
                {day.slice(0, 3)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-3 border-t space-y-2">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Booking Lead Time:</span>
              <span>{hospitalSettings.booking_lead_time_hours}h</span>
            </div>
            <div className="flex justify-between">
              <span>Max Appointments/Doctor:</span>
              <span>{hospitalSettings.max_appointments_per_doctor}</span>
            </div>
            <div className="flex justify-between">
              <span>Emergency Slots:</span>
              <span>{hospitalSettings.emergency_slots_percentage}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};