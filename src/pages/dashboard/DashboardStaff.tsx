
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { StaffCounter } from "@/components/staff/StaffCounter";
import { StaffOT } from "@/components/staff/StaffOT";
import { StaffInvoices } from "@/components/staff/StaffInvoices";
import { StaffXray } from "@/components/staff/StaffXray";
import { StaffRevenueBreakdown } from "@/components/staff/StaffRevenueBreakdown";
import { StaffShiftClosing } from "@/components/staff/StaffShiftClosing";
import { StaffPathologyBilling } from "@/components/staff/StaffPathologyBilling";
import { PatientSearchDialog } from "@/components/staff/PatientSearchDialog";
import { Receipt, TestTube, Building2, FileText, Image, Search, ShoppingCart, Clock, Microscope } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";

export default function DashboardStaff() {
  const [activeTab, setActiveTab] = useState("counter");
  const { profile, signOut } = useAuth();
  const { settings: hospitalSettings } = useHospitalSettings();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            {profile.role === 'admin' && (
              <div className="hidden lg:block">
                <AdminDashboardNav />
              </div>
            )}
          </div>
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
        </div>
        {profile.role === 'admin' && (
          <div className="lg:hidden mt-3 overflow-x-auto -mx-4 px-4">
            <AdminDashboardNav />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage hospital operations across departments</p>
            </div>
            <PatientSearchDialog />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-7">
                <TabsTrigger value="counter" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Counter
                </TabsTrigger>
                <TabsTrigger value="pathology-billing" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Microscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Lab
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
            <TabsContent value="pathology-billing" className="mt-4 sm:mt-6">
              <StaffPathologyBilling />
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
