import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, ChartBar, Receipt, Users, Info, User, LogOut, Stethoscope, Pill, RotateCcw, Calendar, FileText, Tag, Clock } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";

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
    if (path === "/dashboard/finance/invoices") return "invoices";
    if (path === "/dashboard/finance/discounts") return "discounts";
    return "dashboard";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "dashboard": navigate("/dashboard/finance"); break;
      case "daily": navigate("/dashboard/finance/daily"); break;
      case "income": navigate("/dashboard/finance/income"); break;
      case "analytics": navigate("/dashboard/finance/analytics"); break;
      case "expenses": navigate("/dashboard/finance/expenses"); break;
      case "payroll": navigate("/dashboard/finance/payroll"); break;
      case "doctor-payments": navigate("/dashboard/finance/doctor-payments"); break;
      case "pharmacy": navigate("/dashboard/finance/pharmacy"); break;
      case "refunds": navigate("/dashboard/finance/refunds"); break;
      case "invoices": navigate("/dashboard/finance/invoices"); break;
      case "discounts": navigate("/dashboard/finance/discounts"); break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-6">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                {hospitalSettings?.logo_url ? (
                  <img 
                    src={hospitalSettings.logo_url} 
                    alt="Hospital Logo" 
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                  />
                ) : (
                  <span className="inline-block w-2 h-6 sm:h-8 bg-blue-500 rounded-full" />
                )}
                <span className="truncate">{hospitalSettings?.hospital_name || "HIMS"}</span>
              </h1>
            </div>
            {profile?.role === 'admin' && (
              <div className="hidden lg:block">
                <AdminDashboardNav />
              </div>
            )}
          </div>
          {profile && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{profile.first_name} {profile.last_name}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {profile.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
        {profile?.role === 'admin' && (
          <div className="lg:hidden mt-3 overflow-x-auto -mx-4 px-4">
            <AdminDashboardNav />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6">
        <div className="mb-4 sm:mb-8">
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Comprehensive financial management and reporting</p>
        </div>

        <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-8">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 lg:grid-cols-11">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Daily
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Income
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <ChartBar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="payroll" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Payroll
              </TabsTrigger>
              <TabsTrigger value="doctor-payments" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Dr. Payments
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Pharmacy
              </TabsTrigger>
              <TabsTrigger value="refunds" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Refunds
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="discounts" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Discounts
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={getCurrentTab()} className="mt-0">
            {children}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
