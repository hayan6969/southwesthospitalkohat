import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  DollarSign, 
  Pill, 
  UserCog, 
  Stethoscope,
  Users,
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
    <div className="flex items-center gap-2">
      {dashboards.map((dashboard) => {
        const Icon = dashboard.icon;
        const isActive = currentDashboard === dashboard.path;
        
        return (
          <Button
            key={dashboard.path}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => navigate(dashboard.path)}
            className={`flex items-center gap-2 ${
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {dashboard.label}
          </Button>
        );
      })}
    </div>
  );
}