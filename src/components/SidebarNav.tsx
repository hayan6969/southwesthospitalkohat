
import { NavLink } from "react-router-dom";
import { User, Users, Calendar, FileText, Inbox, Info, Activity, Building2, Shield } from "lucide-react";

type SidebarNavProps = {
  role: string;
};

const navsByRole: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  patient: [
    { label: "Dashboard", to: "/dashboard/patient", icon: Info },
    { label: "My Appointments", to: "/dashboard/patient/appointments", icon: Calendar },
    { label: "Medical Records", to: "/dashboard/patient/records", icon: FileText },
    { label: "Invoices", to: "/dashboard/patient/invoices", icon: Inbox },
    { label: "Lab Reports", to: "/dashboard/patient/labs", icon: Activity },
  ],
  doctor: [
    { label: "Dashboard", to: "/dashboard/doctor", icon: Info },
    { label: "My Schedule", to: "/dashboard/doctor/schedule", icon: Calendar },
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
    { label: "Dashboard", to: "/dashboard/admin", icon: Info },
    { label: "Departments", to: "/dashboard/admin/departments", icon: Building2 },
    { label: "Staff Management", to: "/dashboard/admin/staff", icon: User },
    { label: "Doctors", to: "/dashboard/admin/doctors", icon: Users },
    { label: "Audit Logs", to: "/dashboard/admin/audit-logs", icon: Shield },
  ],
};

export function SidebarNav({ role }: SidebarNavProps) {
  const items = navsByRole[role] ?? [];
  return (
    <aside className="bg-slate-900 w-64 py-6 flex flex-col">
      <div className="px-6 mb-8">
        <h2 className="text-white font-semibold text-lg">Main Menu</h2>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 gap-3 rounded-lg font-medium transition-all
               ${isActive 
                 ? "bg-blue-600 text-white shadow-lg" 
                 : "text-slate-300 hover:bg-slate-800 hover:text-white"
               }`
            }
          >
            <item.icon size={18} className="opacity-80" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-6 pt-4 text-xs text-slate-400 border-t border-slate-700">
        <div className="mb-2">Clinic</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Users size={14} />
            <span>Doctors</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <User size={14} />
            <span>Patients</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={14} />
            <span>Appointments</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
