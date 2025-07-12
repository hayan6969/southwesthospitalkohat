import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, ChartBar, Receipt, Users, Info } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";

interface FinanceLayoutProps {
  children: ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings: hospitalSettings } = useHospitalSettings();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/dashboard/finance") return "dashboard";
    if (path === "/dashboard/finance/income") return "income";
    if (path === "/dashboard/finance/analytics") return "analytics";
    if (path === "/dashboard/finance/expenses") return "expenses";
    if (path === "/dashboard/finance/payroll") return "payroll";
    return "dashboard";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "dashboard":
        navigate("/dashboard/finance");
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          {hospitalSettings?.logo_url ? (
            <img 
              src={hospitalSettings.logo_url} 
              alt="Hospital Logo" 
              className="w-8 h-8 object-contain"
            />
          ) : (
            <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{hospitalSettings?.hospital_name || "HIMS"} - Finance Management</h1>
        </div>
        <p className="text-gray-600 mt-1">Comprehensive financial management and reporting</p>
      </div>

      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Dashboard
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
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value={getCurrentTab()} className="mt-0">
          {children}
        </TabsContent>
      </Tabs>
    </div>
  );
}