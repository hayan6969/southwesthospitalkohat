
import { NavLink } from "react-router-dom";
import { User, Users, Calendar, FileText, Inbox, Info } from "lucide-react";

type SidebarNavProps = {
  role: string;
};

const navsByRole: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  patient: [
    { label: "My Appointments", to: "/dashboard/patient", icon: Calendar },
    { label: "Medical Records", to: "/dashboard/patient/records", icon: FileText },
    { label: "Invoices", to: "/dashboard/patient/invoices", icon: Inbox },
    { label: "Lab Reports", to: "/dashboard/patient/labs", icon: Info },
  ],
  doctor: [
    { label: "My Schedule", to: "/dashboard/doctor", icon: Calendar },
    { label: "Patients", to: "/dashboard/doctor/patients", icon: Users },
    { label: "Medical Notes", to: "/dashboard/doctor/notes", icon: FileText },
  ],
  staff: [
    { label: "Dashboard", to: "/dashboard/staff", icon: Info },
    { label: "Patients", to: "/dashboard/staff/patients", icon: Users },
    { label: "Appointments", to: "/dashboard/staff/appointments", icon: Calendar },
    { label: "Invoices", to: "/dashboard/staff/invoices", icon: Inbox },
    { label: "Lab Reports", to: "/dashboard/staff/labs", icon: FileText },
  ],
  admin: [
    { label: "Overview", to: "/dashboard/admin", icon: Info },
    { label: "Departments", to: "/dashboard/admin/departments", icon: Users },
    { label: "Staff", to: "/dashboard/admin/staff", icon: User },
    { label: "Doctors", to: "/dashboard/admin/doctors", icon: User },
    { label: "Audit Logs", to: "/dashboard/admin/audit-logs", icon: FileText },
  ],
};

export function SidebarNav({ role }: SidebarNavProps) {
  const items = navsByRole[role] ?? [];
  return (
    <aside className="bg-white w-60 border-r py-6 flex flex-col">
      <nav className="flex-1 flex flex-col gap-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-2 gap-2 rounded-md font-medium transition
               ${isActive ? "bg-primary text-white" : "hover:bg-muted text-primary"}`
            }
          >
            <item.icon size={20} className="opacity-70" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-4 pt-4 text-xs text-muted-foreground">
        <span>Powered by Lovable</span>
      </div>
    </aside>
  );
}
