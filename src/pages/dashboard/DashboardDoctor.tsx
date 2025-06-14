
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { MiniChart } from "@/components/MiniChart";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Calendar, Users, Clock, CheckCircle } from "lucide-react";

const chartData = {
  appointments: [{ value: 8 }, { value: 12 }, { value: 15 }, { value: 10 }, { value: 18 }],
  patients: [{ value: 45 }, { value: 52 }, { value: 58 }, { value: 55 }, { value: 62 }],
};

export default function DashboardDoctor() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-8">Welcome, Dr. Smith!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Appointments"
          value="8"
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          chart={<MiniChart data={chartData.appointments} type="bar" color="#3b82f6" />}
        />
        <StatsCard
          title="Total Patients"
          value="124"
          change="+12%"
          changeType="positive"
          icon={<Users className="w-5 h-5 text-green-600" />}
          chart={<MiniChart data={chartData.patients} type="line" color="#10b981" />}
        />
        <StatsCard
          title="Completed Today"
          value="6"
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
        />
        <StatsCard
          title="Next Appointment"
          value="2:30 PM"
          icon={<Clock className="w-5 h-5 text-orange-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Today's Schedule</h3>
          <DemoTable
            columns={["Time", "Patient", "Type"]}
            data={[
              ["09:00 AM", "Jane Doe", "Routine Checkup"],
              ["10:30 AM", "John Smith", "Follow-up"],
              ["11:00 AM", "Mary Johnson", "Consultation"],
              ["02:30 PM", "Robert Brown", "Routine Checkup"],
            ]}
          />
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Recent Patients</h3>
          <DemoTable
            columns={["Patient", "Last Visit", "Status"]}
            data={[
              ["Jane Doe", "2024-06-10", "Stable"],
              ["John Smith", "2024-06-08", "Follow-up needed"],
              ["Mary Johnson", "2024-06-12", "Recovered"],
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <AuditLog 
          title="Recent Activity"
          events={[
            { who: "You", when: "2024-06-14 10:15", what: "Completed consultation", details: "Jane Doe - Routine checkup" },
            { who: "You", when: "2024-06-14 09:30", what: "Updated medical notes", details: "John Smith - Blood pressure medication adjustment" },
            { who: "Lab Team", when: "2024-06-14 08:45", what: "Lab results available", details: "Mary Johnson - Blood work complete" },
          ]} 
        />
      </div>
    </AppLayout>
  );
}
