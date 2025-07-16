import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, ChartBar, Receipt, Users, Info, User, LogOut, Stethoscope, Pill, RotateCcw, Calendar } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface FinanceLayoutProps {
  children: ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings: hospitalSettings } = useHospitalSettings();
  const { profile, signOut } = useAuth();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/dashboard/finance") return "dashboard";
    if (path === "/dashboard/finance/daily") return "daily";
    if (path === "/dashboard/finance/income") return "income";
    if (path === "/dashboard/finance/analytics") return "analytics";
    if (path === "/dashboard/finance/expenses") return "expenses";
    if (path === "/dashboard/finance/payroll") return "payroll";
    if (path === "/dashboard/finance/doctor-payments") return "doctor-payments";
    if (path === "/dashboard/finance/pharmacy") return "pharmacy";
    if (path === "/dashboard/finance/refunds") return "refunds";
    return "dashboard";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "dashboard":
        navigate("/dashboard/finance");
        break;
      case "daily":
        navigate("/dashboard/finance/daily");
        break;
      case "income":
        navigate("/dashboard/finance/income");
        break;
      case "analytics":
        navigate("/dashboard/finance/analytics");
        break;
      case "expenses":
        navigate("/dashboard/finance/expenses");
        break;
      case "payroll":
        navigate("/dashboard/finance/payroll");
        break;
      case "doctor-payments":
        navigate("/dashboard/finance/doctor-payments");
        break;
      case "pharmacy":
        navigate("/dashboard/finance/pharmacy");
        break;
      case "refunds":
        navigate("/dashboard/finance/refunds");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {hospitalSettings?.logo_url ? (
                <img 
                  src={hospitalSettings.logo_url} 
                  alt="Hospital Logo" 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
              )}
              {hospitalSettings?.hospital_name || "HIMS"}
            </h1>
          </div>
          {profile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{profile.first_name} {profile.last_name}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {profile.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="mb-8">
          <p className="text-gray-600 mt-1">Comprehensive financial management and reporting</p>
        </div>

      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-9 mb-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Income & Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <ChartBar className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Payroll
          </TabsTrigger>
          <TabsTrigger value="doctor-payments" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Doctor Payments
          </TabsTrigger>
          <TabsTrigger value="pharmacy" className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Pharmacy
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Refunds
          </TabsTrigger>
        </TabsList>

        <TabsContent value={getCurrentTab()} className="mt-0">
          {children}
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}