
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { AppointmentChart } from "@/components/AppointmentChart";
import { MiniChart } from "@/components/MiniChart";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { useStats } from "@/hooks/useDatabase";
import { Users, UserCheck, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const chartData = {
  doctors: [{ value: 180 }, { value: 200 }, { value: 247 }, { value: 230 }, { value: 247 }],
  patients: [{ value: 3800 }, { value: 4000 }, { value: 4178 }, { value: 4100 }, { value: 4178 }],
  appointments: [{ value: 11000 }, { value: 11500 }, { value: 12178 }, { value: 12000 }, { value: 12178 }],
  revenue: [{ value: 48000 }, { value: 52000 }, { value: 55240 }, { value: 54000 }, { value: 55240 }],
};

export default function DashboardAdmin() {
  const { data: stats, isLoading } = useStats();

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="flex gap-3">
          <AppointmentDialog />
          <Button variant="outline">Schedule Availability</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Doctors"
          value={stats?.totalDoctors?.toString() || "0"}
          change="+5%"
          changeType="positive"
          icon={<UserCheck className="w-5 h-5 text-blue-600" />}
          chart={<MiniChart data={chartData.doctors} type="bar" color="#3b82f6" />}
          loading={isLoading}
        />
        <StatsCard
          title="Patients"
          value={stats?.totalPatients?.toString() || "0"}
          change="+25%"
          changeType="positive"
          icon={<Users className="w-5 h-5 text-orange-600" />}
          chart={<MiniChart data={chartData.patients} type="area" color="#f97316" />}
          loading={isLoading}
        />
        <StatsCard
          title="Appointments"
          value={stats?.totalAppointments?.toString() || "0"}
          change="-5%"
          changeType="negative"
          icon={<Calendar className="w-5 h-5 text-red-600" />}
          chart={<MiniChart data={chartData.appointments} type="bar" color="#ef4444" />}
          loading={isLoading}
        />
        <StatsCard
          title="Revenue"
          value={`$${stats?.totalRevenue?.toLocaleString() || "0"}`}
          change="+23%"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          chart={<MiniChart data={chartData.revenue} type="line" color="#10b981" />}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <AppointmentChart />
        </div>
        <div>
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold mb-4">Popular Doctors</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Dr. Alex Morgan</p>
                  <p className="text-sm text-muted-foreground">Cardiologist</p>
                </div>
                <span className="text-sm font-medium">98%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Dr. Emily Carter</p>
                  <p className="text-sm text-muted-foreground">Pediatrician</p>
                </div>
                <span className="text-sm font-medium">95%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Dr. David Lee</p>
                  <p className="text-sm text-muted-foreground">Neurologist</p>
                </div>
                <span className="text-sm font-medium">92%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-4">Recent Staff Activity</h3>
          <DemoTable
            columns={["Staff Member", "Department", "Last Activity"]}
            data={[
              ["Amy Taylor", "Reception", "2 hours ago"],
              ["Tom Chan", "Laboratory", "4 hours ago"],
              ["Alice Smith", "General Medicine", "1 hour ago"],
            ]}
          />
        </div>
        <div>
          <AuditLog events={[
            { who: "Amy Taylor", when: "2024-06-14 14:30", what: "Registered new patient", details: "John Doe" },
            { who: "Dr. Alice Smith", when: "2024-06-14 13:45", what: "Updated medical records", details: "Patient ID: 1234" },
            { who: "Tom Chan", when: "2024-06-14 12:15", what: "Uploaded lab results", details: "Blood test results" },
          ]} />
        </div>
      </div>
    </AppLayout>
  );
}
