import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAppointmentStats } from '@/hooks/useAppointmentStats';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subMonths, format } from 'date-fns';

export function RealAppointmentChart() {
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined);
  const { data: appointmentStats, isLoading } = useAppointmentStats(selectedMonth);
  
  // Generate last 6 months for dropdown
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, 'MMMM yyyy')
    };
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!appointmentStats) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">No appointment data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Appointment Statistics</h3>
        <Select 
          value={selectedMonth?.toISOString() || 'all'} 
          onValueChange={(value) => setSelectedMonth(value === 'all' ? undefined : new Date(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Last 12 Months</SelectItem>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">All Appointments</p>
          <p className="text-xl font-bold">{appointmentStats.totals.all}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-1">Cancelled</p>
          <p className="text-xl font-bold">{appointmentStats.totals.cancelled}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-orange-600 mb-1">Reschedule</p>
          <p className="text-xl font-bold">{appointmentStats.totals.rescheduled}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-green-600 mb-1">Completed</p>
          <p className="text-xl font-bold">{appointmentStats.totals.completed}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={appointmentStats.monthlyData}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
            <Bar dataKey="ongoing" stackId="a" fill="#3b82f6" name="Scheduled" />
            <Bar dataKey="rescheduled" stackId="a" fill="#f59e0b" name="Rescheduled" />
            <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}