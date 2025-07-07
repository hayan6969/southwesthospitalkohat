
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { useStats } from "@/hooks/useStats";
import { useAppointments } from "@/hooks/useAppointments";
import { Calendar, Users, FileText, Clock } from "lucide-react";

export default function DashboardDoctor() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();

  const todayAppointments = appointments?.filter(apt => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.appointment_date).toDateString();
    return today === aptDate;
  }) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, Dr. Smith!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Today's Appointments"
            value={todayAppointments.length}
            icon={<Calendar className="w-5 h-5 text-blue-600" />}
            loading={appointmentsLoading}
          />
          <StatsCard
            title="Total Patients"
            value={stats?.totalPatients || 0}
            icon={<Users className="w-5 h-5 text-green-600" />}
            loading={statsLoading}
          />
          <StatsCard
            title="Pending Reports"
            value="7"
            icon={<FileText className="w-5 h-5 text-orange-600" />}
          />
          <StatsCard
            title="Hours Today"
            value="6.5"
            icon={<Clock className="w-5 h-5 text-purple-600" />}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold mb-4">Today's Schedule</h3>
            <DemoTable
              columns={["Time", "Patient", "Type"]}
              data={[
                ["09:00 AM", "John Doe", "Consultation"],
                ["10:00 AM", "Jane Smith", "Follow-up"],
                ["11:30 AM", "Bob Johnson", "Check-up"],
                ["02:00 PM", "Alice Brown", "Consultation"],
              ]}
            />
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold mb-4">Recent Patients</h3>
            <DemoTable
              columns={["Patient", "Last Visit", "Status"]}
              data={[
                ["John Doe", "Yesterday", "Stable"],
                ["Jane Smith", "2 days ago", "Recovering"],
                ["Bob Johnson", "3 days ago", "Follow-up needed"],
                ["Alice Brown", "1 week ago", "Stable"],
              ]}
            />
          </div>
        </div>

        <div className="mt-8">
          <AuditLog 
            title="Recent Activity"
            events={[
              { who: "Dr. Smith", when: "2024-06-12 14:30", what: "Patient consultation completed", details: "John Doe - Annual physical" },
              { who: "Dr. Smith", when: "2024-06-12 13:15", what: "Lab report reviewed", details: "Jane Smith - Blood work results" },
              { who: "Dr. Smith", when: "2024-06-12 11:45", what: "Prescription updated", details: "Bob Johnson - Medication adjustment" },
            ]} 
          />
        </div>
      </div>
    </AppLayout>
  );
}
