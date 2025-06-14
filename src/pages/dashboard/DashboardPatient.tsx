
import AppLayout from "@/layouts/AppLayout";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";

export default function DashboardPatient() {
  return (
    <AppLayout>
      <h2 className="text-2xl font-bold mb-2">Welcome, Patient!</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6">
        <div>
          <h3 className="font-semibold mb-2">Upcoming Appointments</h3>
          <DemoTable
            columns={["Date", "Doctor", "Status"]}
            data={[
              ["2024-06-15", "Dr. Alice Smith", "Confirmed"],
              ["2024-06-18", "Dr. Bob Lee", "Requested"],
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Invoices</h3>
          <DemoTable
            columns={["Invoice #", "Date", "Amount", "Status"]}
            data={[
              ["INV-055", "2024-05-31", "$45", "Paid"],
              ["INV-057", "2024-06-10", "$90", "Unpaid"],
            ]}
          />
        </div>
      </div>
      <div className="mt-10">
        <AuditLog events={[
          { who: "Lab Staff", when: "2024-06-10 09:22", what: "Uploaded lab report", details: "CBC result" },
          { who: "Reception", when: "2024-06-08 08:30", what: "Checked-in for appointment" },
        ]} />
      </div>
    </AppLayout>
  );
}
