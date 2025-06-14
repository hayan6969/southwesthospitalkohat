
import AppLayout from "@/layouts/AppLayout";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";

export default function DashboardStaff() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-2">Welcome, Staff!</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="font-semibold mb-2">Recent Registrations</h3>
          <DemoTable
            columns={["Patient", "Registration Date", "Assigned Doctor"]}
            data={[
              ["Nancy Drew", "2024-06-11", "Dr. Bob Lee"],
              ["Alice Wong", "2024-06-09", "Dr. Alice Smith"],
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Pending Appointments</h3>
          <DemoTable
            columns={["Patient", "Date", "Department"]}
            data={[
              ["Nancy Drew", "2024-06-15", "Pediatrics"],
              ["Alice Wong", "2024-06-16", "General Medicine"],
            ]}
          />
        </div>
      </div>
      <div className="mt-10">
        <AuditLog events={[
          { who: "You", when: "2024-06-12 11:45", what: "Registered new patient", details: "Alice Wong" },
        ]} />
      </div>
    </AppLayout>
  );
}
