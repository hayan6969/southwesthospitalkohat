import { usePopularDoctors } from '@/hooks/usePopularDoctors';
import { UserCheck, Loader2 } from 'lucide-react';

export function PopularDoctorsWidget() {
  const { data: popularDoctors, isLoading } = usePopularDoctors();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Popular Doctors</h3>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="w-8 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!popularDoctors || popularDoctors.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Popular Doctors</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">No doctor data available</p>
        </div>
      </div>
    );
  }

  const getIconColor = (index: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    return colors[index % colors.length];
  };

  const getBgColor = (index: number) => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-red-100'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h3 className="font-semibold mb-4">Popular Doctors</h3>
      <div className="space-y-4">
        {popularDoctors.map((doctor, index) => (
          <div key={doctor.id} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${getBgColor(index)} flex items-center justify-center`}>
              <UserCheck className={`w-5 h-5 ${getIconColor(index)}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{doctor.successRate}%</span>
              <p className="text-xs text-gray-500">{doctor.totalAppointments} appointments</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}