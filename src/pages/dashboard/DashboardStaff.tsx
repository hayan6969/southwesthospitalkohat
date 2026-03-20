
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { StaffCounter } from "@/components/staff/StaffCounter";
import { StaffLab } from "@/components/staff/StaffLab";
import { StaffOT } from "@/components/staff/StaffOT";
import { StaffInvoices } from "@/components/staff/StaffInvoices";
import { StaffLabReports } from "@/components/staff/StaffLabReports";
import { StaffXray } from "@/components/staff/StaffXray";
import { StaffRevenueBreakdown } from "@/components/staff/StaffRevenueBreakdown";
import { StaffShiftClosing } from "@/components/staff/StaffShiftClosing";
import { PatientSearchDialog } from "@/components/staff/PatientSearchDialog";
import { Receipt, TestTube, Building2, FileText, Image, Search, ShoppingCart, Clock } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";

export default function DashboardStaff() {
  const [activeTab, setActiveTab] = useState("counter");
  const { profile, signOut } = useAuth();
  const { settings: hospitalSettings } = useHospitalSettings();

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage hospital operations across departments</p>
            </div>
            <PatientSearchDialog />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-8">
                <TabsTrigger value="counter" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Counter
                </TabsTrigger>
                <TabsTrigger value="lab" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <TestTube className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Lab
                </TabsTrigger>
                <TabsTrigger value="lab-reports" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Lab Reports
                </TabsTrigger>
                <TabsTrigger value="xray" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  X-ray
                </TabsTrigger>
                <TabsTrigger value="ot" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  OT
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="shift-closing" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Shift Close
                </TabsTrigger>
                <TabsTrigger value="supplies" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Supplies
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="counter" className="mt-4 sm:mt-6 space-y-6">
              <StaffCounter />
              <StaffRevenueBreakdown />
            </TabsContent>
            <TabsContent value="lab" className="mt-4 sm:mt-6">
              <StaffLab />
            </TabsContent>
            <TabsContent value="lab-reports" className="mt-4 sm:mt-6">
              <StaffLabReports />
            </TabsContent>
            <TabsContent value="xray" className="mt-4 sm:mt-6">
              <StaffXray />
            </TabsContent>
            <TabsContent value="ot" className="mt-4 sm:mt-6">
              <StaffOT />
            </TabsContent>
            <TabsContent value="invoices" className="mt-4 sm:mt-6">
              <StaffInvoices />
            </TabsContent>
            <TabsContent value="shift-closing" className="mt-4 sm:mt-6">
              <StaffShiftClosing />
            </TabsContent>
            <TabsContent value="supplies" className="mt-4 sm:mt-6">
              <MySupplyRequests />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
