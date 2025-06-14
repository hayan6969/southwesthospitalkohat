
import AppLayout from "@/layouts/AppLayout";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";

export default function DashboardDoctor() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-2">Welcome, Doctor!</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="font-semibold mb-2">Today's Appointments</h3>
          <DemoTable
            columns={["Time", "Patient", "Reason"]}
            data={[
              ["09:00", "Jane Doe", "Routine checkup"],
              ["10:30", "John Smith", "Flu symptoms"],
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">My Patients</h3>
          <DemoTable
            columns={["Patient", "Last Visit", "Diagnosis"]}
            data={[
              ["Jane Doe", "2024-06-10", "Diabetes"],
              ["John Smith", "2024-04-20", "Influenza"],
            ]}
          />
        </div>
      </div>
      <div className="mt-10">
        <AuditLog events={[
          { who: "You", when: "2024-06-10 12:00", what: "Added note", details: "Follow-up in 1 week" },
        ]} />
      </div>
    </AppLayout>
  );
}
