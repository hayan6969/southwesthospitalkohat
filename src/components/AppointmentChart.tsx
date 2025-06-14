
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', completed: 2100, ongoing: 400, rescheduled: 300 },
  { month: 'Feb', completed: 2400, ongoing: 500, rescheduled: 200 },
  { month: 'Mar', completed: 3200, ongoing: 600, rescheduled: 400 },
  { month: 'Apr', completed: 3100, ongoing: 700, rescheduled: 350 },
  { month: 'May', completed: 4000, ongoing: 800, rescheduled: 500 },
  { month: 'Jun', completed: 1800, ongoing: 400, rescheduled: 200 },
  { month: 'Jul', completed: 2300, ongoing: 500, rescheduled: 300 },
  { month: 'Aug', completed: 2800, ongoing: 600, rescheduled: 400 },
  { month: 'Sep', completed: 4200, ongoing: 900, rescheduled: 600 },
  { month: 'Oct', completed: 4000, ongoing: 800, rescheduled: 550 },
  { month: 'Nov', completed: 3200, ongoing: 650, rescheduled: 450 },
  { month: 'Dec', completed: 2800, ongoing: 550, rescheduled: 350 },
];

export function AppointmentChart() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Appointment Statistics</h3>
        <select className="text-sm border rounded px-3 py-1">
          <option>Monthly</option>
          <option>Weekly</option>
          <option>Daily</option>
        </select>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">All Appointments</p>
          <p className="text-xl font-bold">6314</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-1">Cancelled</p>
          <p className="text-xl font-bold">456</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-orange-600 mb-1">Reschedule</p>
          <p className="text-xl font-bold">745</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-green-600 mb-1">Completed</p>
          <p className="text-xl font-bold">4578</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Bar dataKey="completed" stackId="a" fill="#10b981" />
            <Bar dataKey="ongoing" stackId="a" fill="#3b82f6" />
            <Bar dataKey="rescheduled" stackId="a" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
