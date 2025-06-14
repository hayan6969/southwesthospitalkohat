
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { MiniChart } from "@/components/MiniChart";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { UserPlus, Calendar, Clock, CheckCircle } from "lucide-react";

const chartData = {
  registrations: [{ value: 5 }, { value: 8 }, { value: 12 }, { value: 7 }, { value: 15 }],
  appointments: [{ value: 25 }, { value: 30 }, { value: 28 }, { value: 35 }, { value: 32 }],
};

export default function DashboardStaff() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-8">Staff Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="New Registrations"
          value="15"
          change="+8%"
          changeType="positive"
          icon={<UserPlus className="w-5 h-5 text-blue-600" />}
          chart={<MiniChart data={chartData.registrations} type="bar" color="#3b82f6" />}
        />
        <StatsCard
          title="Pending Appointments"
          value="32"
          icon={<Calendar className="w-5 h-5 text-orange-600" />}
          chart={<MiniChart data={chartData.appointments} type="line" color="#f97316" />}
        />
        <StatsCard
          title="Processed Today"
          value="28"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        />
        <StatsCard
          title="Queue Time"
          value="12 min"
          icon={<Clock className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Recent Registrations</h3>
          <DemoTable
            columns={["Patient", "Registration Date", "Assigned Doctor"]}
            data={[
              ["Nancy Drew", "2024-06-14", "Dr. Bob Lee"],
              ["Alice Wong", "2024-06-14", "Dr. Alice Smith"],
              ["Mark Wilson", "2024-06-13", "Dr. Emily Carter"],
            ]}
          />
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Appointment Queue</h3>
          <DemoTable
            columns={["Patient", "Time", "Status"]}
            data={[
              ["John Doe", "2:30 PM", "Waiting"],
              ["Sarah Johnson", "3:00 PM", "In Progress"],
              ["Michael Brown", "3:30 PM", "Scheduled"],
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <AuditLog 
          title="Today's Activity"
          events={[
            { who: "You", when: "2024-06-14 14:30", what: "Registered new patient", details: "Nancy Drew - General consultation" },
            { who: "You", when: "2024-06-14 13:15", what: "Scheduled appointment", details: "Alice Wong with Dr. Smith" },
            { who: "You", when: "2024-06-14 12:45", what: "Updated patient info", details: "Contact details for Mark Wilson" },
          ]} 
        />
      </div>
    </AppLayout>
  );
}
