import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  DollarSign, 
  Pill, 
  UserCog, 
  Calendar
} from "lucide-react";

const dashboards = [
  { path: "/dashboard/admin", label: "Admin", icon: Settings },
  { path: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { path: "/dashboard/pharmacy", label: "Pharmacy", icon: Pill },
  { path: "/dashboard/staff", label: "Staff", icon: UserCog },
  { path: "/dashboard/ota", label: "OT", icon: Calendar },
];

export function AdminDashboardNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentDashboard = () => {
    const path = location.pathname;
    return dashboards.find(d => path.startsWith(d.path))?.path || "";
  };

  const currentDashboard = getCurrentDashboard();

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {dashboards.map((dashboard) => {
        const Icon = dashboard.icon;
        const isActive = currentDashboard === dashboard.path;
        
        return (
          <Button
            key={dashboard.path}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => navigate(dashboard.path)}
            className={`flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2 ${
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{dashboard.label}</span>
            <span className="sm:hidden">{dashboard.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
