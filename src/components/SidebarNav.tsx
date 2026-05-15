
import { NavLink, useLocation } from "react-router-dom";
import { User, Users, Calendar, FileText, Inbox, Info, Activity, Building2, Shield, Pill, Clock, TestTube, CreditCard, Calculator, Receipt, Settings, ChartBar, UserPlus, Stethoscope, Upload, CheckCircle, RotateCcw, FlaskConical, Menu, X, Package, Warehouse, Tag, PackageCheck, BedDouble } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
    { label: "Departments", to: "/dashboard/admin/departments", icon: Building2 },
    { label: "Account Management", to: "/dashboard/admin/accounts", icon: Users },
    { label: "Lab", to: "/dashboard/admin?tab=lab", icon: FlaskConical },
    { label: "IPD", to: "/dashboard/ipd", icon: BedDouble },
    { label: "System Settings", to: "/dashboard/admin/settings", icon: Settings },
  ],
  head_pharmacist: [
    { label: "Dashboard", to: "/dashboard/pharmacy", icon: Info },
    { label: "IPD Orders", to: "/dashboard/pharmacy?tab=ipd", icon: PackageCheck },
    { label: "Medicines", to: "/dashboard/pharmacy/medicines", icon: Pill },
    { label: "Sell Medicine", to: "/dashboard/pharmacy/sell", icon: CreditCard },
    { label: "Invoices", to: "/dashboard/pharmacy/invoices", icon: Receipt },
    { label: "Returns", to: "/dashboard/pharmacy/returns", icon: RotateCcw },
    { label: "Stock Tracking", to: "/dashboard/pharmacy/stock", icon: CheckCircle },
    { label: "Expiry Tracker", to: "/dashboard/pharmacy/expiry", icon: Calendar },
    { label: "Lab Reports", to: "/dashboard/pharmacy/lab-reports", icon: FlaskConical },
    { label: "Sticker Printer", to: "/dashboard/pharmacy/stickers", icon: Tag },
    { label: "Analytics", to: "/dashboard/pharmacy/analytics", icon: Activity },
  ],
  assistant_pharmacist: [
    { label: "Dashboard", to: "/dashboard/pharmacy", icon: Info },
    { label: "IPD Orders", to: "/dashboard/pharmacy?tab=ipd", icon: PackageCheck },
    { label: "Medicines", to: "/dashboard/pharmacy/medicines", icon: Pill },
    { label: "Sell Medicine", to: "/dashboard/pharmacy/sell", icon: CreditCard },
    { label: "Invoices", to: "/dashboard/pharmacy/invoices", icon: Receipt },
    { label: "Returns", to: "/dashboard/pharmacy/returns", icon: RotateCcw },
    { label: "Stock Tracking", to: "/dashboard/pharmacy/stock", icon: CheckCircle },
    { label: "Expiry Tracker", to: "/dashboard/pharmacy/expiry", icon: Calendar },
    { label: "Lab Reports", to: "/dashboard/pharmacy/lab-reports", icon: FlaskConical },
    { label: "Sticker Printer", to: "/dashboard/pharmacy/stickers", icon: Tag },
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
  inventory_manager: [
    { label: "Dashboard", to: "/dashboard/store", icon: Info },
    { label: "Applications", to: "/dashboard/store?tab=requests", icon: Inbox },
    { label: "General Stock", to: "/dashboard/store?tab=general", icon: Package },
    { label: "Lab Stock", to: "/dashboard/store?tab=lab", icon: FlaskConical },
    { label: "Store / Provide", to: "/dashboard/store?tab=provide", icon: Warehouse },
    { label: "Distribution", to: "/dashboard/store?tab=distribution", icon: Users },
  ],
  store: [
    { label: "Dashboard", to: "/dashboard/store", icon: Info },
    { label: "General Inventory", to: "/dashboard/store?tab=general", icon: Package },
    { label: "Lab Inventory", to: "/dashboard/store?tab=lab", icon: FlaskConical },
    { label: "Store / Provide", to: "/dashboard/store?tab=provide", icon: Warehouse },
  ],
  lab: [
    { label: "Dashboard", to: "/dashboard/lab", icon: Info },
    { label: "Lab", to: "/dashboard/lab?tab=pathology", icon: TestTube },
    { label: "Lab History", to: "/dashboard/lab?tab=pathology-history", icon: FileText },
    { label: "Manage Tests", to: "/dashboard/lab?tab=manage-tests", icon: FlaskConical },
    { label: "Lab Item Supply", to: "/dashboard/lab?tab=inventory", icon: FlaskConical },
    { label: "Request Supplies", to: "/dashboard/lab?tab=supplies", icon: Package },
  ],
  ipd: [
    { label: "Dashboard", to: "/dashboard/ipd", icon: Info },
  ],
};

export function SidebarNav({ role }: SidebarNavProps) {
  const items = navsByRole[role] ?? [];
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const location = useLocation();

  const isItemActive = (item: { to: string }) => {
    const [itemPath, itemSearch] = item.to.split("?");
    if (itemSearch) {
      // Query-param based: match path + exact query param value
      if (location.pathname !== itemPath) return false;
      const itemParams = new URLSearchParams(itemSearch);
      const currentParams = new URLSearchParams(location.search);
      for (const [k, v] of itemParams.entries()) {
        if (currentParams.get(k) !== v) return false;
      }
      return true;
    }
    // For dashboard root links, exact match
    if (item.to === `/dashboard/${role}` || item.to === "/dashboard/pharmacy" || item.to === "/dashboard/finance" || item.to === "/dashboard/store" || item.to === "/dashboard/lab" || item.to === "/dashboard/ipd") {
      return location.pathname === itemPath && !location.search;
    }
    return location.pathname.startsWith(itemPath);
  };

  const sidebarContent = (
    <>
      <div className="px-6 mb-8 flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">Main Menu</h2>
        {isMobile && (
          <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-4">
        {items.map((item) => {
          const active = isItemActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => isMobile && setOpen(false)}
              className={
                `flex items-center px-4 py-3 gap-3 rounded-lg font-medium transition-all
                 ${active
                   ? "bg-blue-600 text-white shadow-lg" 
                   : "text-slate-300 hover:bg-slate-800 hover:text-white"
                 }`
              }
            >
              <item.icon size={18} className="opacity-80" />
              {item.label}
            </NavLink>
          );
        })}
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
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button - fixed */}
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Slide-out sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-slate-900 w-64 py-6 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside className="bg-slate-900 w-64 py-6 flex flex-col shrink-0">
      {sidebarContent}
    </aside>
  );
}
