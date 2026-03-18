import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  DollarSign, 
  Pill, 
  UserCog, 
  Calendar,
  Building2,
  MapPin,
  Package,
  Warehouse
} from "lucide-react";

const dashboards = [
  { path: "/dashboard/admin", label: "Admin", icon: Settings },
  { path: "/dashboard/admin/departments", label: "Departments", icon: Building2 },
  { path: "/dashboard/admin/regions", label: "Regions", icon: MapPin },
  { path: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { path: "/dashboard/pharmacy", label: "Pharmacy", icon: Pill },
  { path: "/dashboard/staff", label: "Staff", icon: UserCog },
  { path: "/dashboard/ota", label: "OT", icon: Calendar },
  { path: "/dashboard/store", label: "Manager", icon: Warehouse },
];

export function AdminDashboardNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentDashboard = () => {
    const path = location.pathname;
    // Check more specific paths first (departments before admin)
    const sorted = [...dashboards].sort((a, b) => b.path.length - a.path.length);
    return sorted.find(d => path.startsWith(d.path))?.path || "";
  };

  const currentDashboard = getCurrentDashboard();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap overflow-x-auto">
      {dashboards.map((dashboard) => {
        const Icon = dashboard.icon;
        const isActive = currentDashboard === dashboard.path;
        
        return (
          <Button
            key={dashboard.path}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => navigate(dashboard.path)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 h-8 sm:text-sm sm:px-3 sm:h-9 ${
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{dashboard.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
