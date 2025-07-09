
import { useState } from "react";
import PatientLayout from "@/layouts/PatientLayout";
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, DollarSign, Activity, Clock, Users, TestTube, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PatientBookAppointment from "./patient/PatientBookAppointment";
import PatientMyAppointments from "./patient/PatientMyAppointments";

export default function DashboardPatient() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const renderOverviewTab = () => (
    <div>
      <h2 className="text-2xl font-bold mb-8">Welcome back, {profile?.first_name}!</h2>
      
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
    </div>
  );

  const renderAppointmentsTab = () => <PatientBookAppointment />;

  const renderMyAppointmentsTab = () => <PatientMyAppointments />;

  const renderRecordsTab = () => (
    <div>
      <h2 className="text-2xl font-bold mb-8">Medical Records</h2>
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <p className="text-gray-600">Medical records functionality will be implemented here.</p>
      </div>
    </div>
  );

  const renderLabsTab = () => (
    <div>
      <h2 className="text-2xl font-bold mb-8">Lab Reports</h2>
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <p className="text-gray-600">Lab reports functionality will be implemented here.</p>
      </div>
    </div>
  );

  const renderInvoicesTab = () => (
    <div>
      <h2 className="text-2xl font-bold mb-8">Invoices</h2>
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <p className="text-gray-600">Invoices functionality will be implemented here.</p>
      </div>
    </div>
  );

  return (
    <PatientLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="book-appointment" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Book Appointment
          </TabsTrigger>
          <TabsTrigger value="my-appointments" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            My Appointments
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Lab Reports
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="book-appointment" className="space-y-4">
          {renderAppointmentsTab()}
        </TabsContent>

        <TabsContent value="my-appointments" className="space-y-4">
          {renderMyAppointmentsTab()}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {renderRecordsTab()}
        </TabsContent>

        <TabsContent value="labs" className="space-y-4">
          {renderLabsTab()}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {renderInvoicesTab()}
        </TabsContent>
      </Tabs>
    </PatientLayout>
  );
}
