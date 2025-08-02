
import { NavLink } from "react-router-dom";
import { User, Users, Calendar, FileText, Inbox, Info, Activity, Building2, Shield, Pill, Clock, TestTube, CreditCard, Calculator, Receipt, Settings, ChartBar, UserPlus, Stethoscope, Upload, CheckCircle, RotateCcw, FlaskConical } from "lucide-react";

type SidebarNavProps = {
  role: string;
};

const navsByRole: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  patient: [
    { label: "Dashboard", to: "/dashboard/patient", icon: Info },
    { label: "Book Appointments", to: "/dashboard/patient/book", icon: Calendar },
    { label: "My Appointments", to: "/dashboard/patient/appointments", icon: Calendar },
    { label: "Medical Records", to: "/dashboard/patient/records", icon: FileText },
    { label: "Lab Reports", to: "/dashboard/patient/labs", icon: Activity },
    { label: "Upload Documents", to: "/dashboard/patient/documents", icon: Upload },
    { label: "Analytics", to: "/dashboard/patient/analytics", icon: ChartBar },
  ],
  doctor: [
    { label: "Dashboard", to: "/dashboard/doctor", icon: Info },
    { label: "Appointments", to: "/dashboard/doctor/appointments", icon: Calendar },
    { label: "Patient History", to: "/dashboard/doctor/patients", icon: Users },
    { label: "Diagnoses & Prescriptions", to: "/dashboard/doctor/diagnoses", icon: Stethoscope },
    { label: "Patient Notes", to: "/dashboard/doctor/notes", icon: FileText },
    { label: "Lab Reports", to: "/dashboard/doctor/labs", icon: TestTube },
    { label: "Analytics", to: "/dashboard/doctor/analytics", icon: ChartBar },
  ],
  staff: [
    { label: "Dashboard", to: "/dashboard/staff", icon: Info },
    { label: "Counter", to: "/dashboard/staff/counter", icon: Receipt },
    { label: "Lab", to: "/dashboard/staff/lab", icon: TestTube },
    { label: "OT", to: "/dashboard/staff/ot", icon: Building2 },
  ],
  ota: [
    { label: "Dashboard", to: "/dashboard/ota", icon: Info },
    { label: "OT Operations", to: "/dashboard/ota/operations", icon: Building2 },
  ],
  nursing: [
    { label: "Dashboard", to: "/dashboard/ota", icon: Info },
    { label: "OT Operations", to: "/dashboard/ota/operations", icon: Building2 },
  ],
  admin: [
    { label: "Dashboard", to: "/dashboard/admin", icon: Info },
    { label: "Account Management", to: "/dashboard/admin/accounts", icon: Users },
    { label: "System Settings", to: "/dashboard/admin/settings", icon: Settings },
  ],
  head_pharmacist: [
    { label: "Dashboard", to: "/dashboard/pharmacy", icon: Info },
    { label: "Medicines", to: "/dashboard/pharmacy/medicines", icon: Pill },
    { label: "Sell Medicine", to: "/dashboard/pharmacy/sell", icon: CreditCard },
    { label: "Invoices", to: "/dashboard/pharmacy/invoices", icon: Receipt },
    { label: "Returns", to: "/dashboard/pharmacy/returns", icon: RotateCcw },
    { label: "Stock Tracking", to: "/dashboard/pharmacy/stock", icon: CheckCircle },
    { label: "Expiry Tracker", to: "/dashboard/pharmacy/expiry", icon: Calendar },
    { label: "Lab Reports", to: "/dashboard/pharmacy/lab-reports", icon: FlaskConical },
    { label: "Analytics", to: "/dashboard/pharmacy/analytics", icon: Activity },
  ],
  assistant_pharmacist: [
    { label: "Dashboard", to: "/dashboard/pharmacy", icon: Info },
    { label: "Medicines", to: "/dashboard/pharmacy/medicines", icon: Pill },
    { label: "Sell Medicine", to: "/dashboard/pharmacy/sell", icon: CreditCard },
    { label: "Invoices", to: "/dashboard/pharmacy/invoices", icon: Receipt },
    { label: "Returns", to: "/dashboard/pharmacy/returns", icon: RotateCcw },
    { label: "Stock Tracking", to: "/dashboard/pharmacy/stock", icon: CheckCircle },
    { label: "Expiry Tracker", to: "/dashboard/pharmacy/expiry", icon: Calendar },
    { label: "Lab Reports", to: "/dashboard/pharmacy/lab-reports", icon: FlaskConical },
    { label: "Analytics", to: "/dashboard/pharmacy/analytics", icon: Activity },
  ],
  salesman_pharmacist: [
    { label: "Dashboard", to: "/dashboard/pharmacy", icon: Info },
    { label: "Sell Medicine", to: "/dashboard/pharmacy/sell", icon: CreditCard },
  ],
  finance: [
    { label: "Dashboard", to: "/dashboard/finance", icon: Info },
    { label: "Income & Transactions", to: "/dashboard/finance/income", icon: Calculator },
    { label: "Analytics", to: "/dashboard/finance/analytics", icon: ChartBar },
    { label: "Expenses", to: "/dashboard/finance/expenses", icon: Receipt },
    { label: "Payroll", to: "/dashboard/finance/payroll", icon: Users },
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
        <div className="mb-2">Hospital System</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Users size={14} />
            <span>Role: {role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
