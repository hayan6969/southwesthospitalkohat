
import AppLayout from "@/layouts/AppLayout";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";

export default function DashboardAdmin() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-2">Welcome, Admin!</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="font-semibold mb-2">Staff Overview</h3>
          <DemoTable
            columns={["Name", "Role", "Department"]}
            data={[
              ["Amy Taylor", "Reception", "Front Desk"],
              ["Tom Chan", "Lab Tech", "Laboratory"],
              ["Alice Smith", "Doctor", "General"],
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Departments</h3>
          <DemoTable
            columns={["Department", "Staff Count", "Doctors"]}
            data={[
              ["Front Desk", "3", "1"],
              ["Laboratory", "2", "0"],
              ["General", "7", "3"],
            ]}
          />
        </div>
      </div>
      <div className="mt-10">
        <AuditLog events={[
          { who: "You", when: "2024-06-11 09:30", what: "Adjusted department staff", details: "Laboratory +1" },
        ]} />
      </div>
    </AppLayout>
  );
}
