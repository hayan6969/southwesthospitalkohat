import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, ChartBar, Receipt, Users, Info, Stethoscope, Pill, RotateCcw, Calendar, FileText, Tag, Clock } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";

interface FinanceLayoutProps {
  children: ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/dashboard/finance") return "dashboard";
    if (path === "/dashboard/finance/daily") return "daily";
    if (path === "/dashboard/finance/income") return "income";
    if (path === "/dashboard/finance/analytics") return "analytics";
    if (path === "/dashboard/finance/expenses") return "expenses";
    if (path === "/dashboard/finance/payroll") return "payroll";
    if (path === "/dashboard/finance/doctor-payments") return "doctor-payments";
    if (path === "/dashboard/finance/staff-payments") return "staff-payments";
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
      case "staff-payments": navigate("/dashboard/finance/staff-payments"); break;
      case "pharmacy": navigate("/dashboard/finance/pharmacy"); break;
      case "refunds": navigate("/dashboard/finance/refunds"); break;
      case "invoices": navigate("/dashboard/finance/invoices"); break;
      case "discounts": navigate("/dashboard/finance/discounts"); break;
    }
  };

  return (
    <AppLayout>
      <div className="mb-4 sm:mb-8">
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Comprehensive financial management and reporting</p>
      </div>

      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-8">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 lg:grid-cols-12">
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
            <TabsTrigger value="staff-payments" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Staff Shifts
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
    </AppLayout>
  );
}
