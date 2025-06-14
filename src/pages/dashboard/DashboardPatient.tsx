
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Calendar, FileText, DollarSign, Activity } from "lucide-react";

export default function DashboardPatient() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-8">Welcome back, John!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Upcoming Appointments"
          value="2"
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
        />
        <StatsCard
          title="Medical Records"
          value="8"
          icon={<FileText className="w-5 h-5 text-green-600" />}
        />
        <StatsCard
          title="Outstanding Bills"
          value="$90"
          icon={<DollarSign className="w-5 h-5 text-red-600" />}
        />
        <StatsCard
          title="Lab Reports"
          value="3"
          icon={<Activity className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Upcoming Appointments</h3>
          <DemoTable
            columns={["Date", "Doctor", "Type"]}
            data={[
              ["June 15, 2024", "Dr. Alice Smith", "Annual Checkup"],
              ["June 18, 2024", "Dr. Bob Lee", "Follow-up"],
            ]}
          />
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Recent Invoices</h3>
          <DemoTable
            columns={["Invoice #", "Date", "Amount", "Status"]}
            data={[
              ["INV-055", "May 31, 2024", "$45", "Paid"],
              ["INV-057", "June 10, 2024", "$90", "Pending"],
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <AuditLog 
          title="Recent Activity"
          events={[
            { who: "Dr. Smith", when: "2024-06-12 15:30", what: "Appointment completed", details: "Annual physical examination" },
            { who: "Lab Team", when: "2024-06-10 09:22", what: "Lab report ready", details: "Complete blood count (CBC)" },
            { who: "Reception", when: "2024-06-08 14:15", what: "Appointment scheduled", details: "Follow-up with Dr. Lee" },
          ]} 
        />
      </div>
    </AppLayout>
  );
}
