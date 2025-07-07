
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffCounter } from "@/components/staff/StaffCounter";
import { StaffLab } from "@/components/staff/StaffLab";
import { StaffOT } from "@/components/staff/StaffOT";
import { Receipt, TestTube, Building2 } from "lucide-react";

export default function DashboardStaff() {
  const [activeTab, setActiveTab] = useState("counter");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage hospital operations across departments</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="counter" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Counter
            </TabsTrigger>
            <TabsTrigger value="lab" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Lab
            </TabsTrigger>
            <TabsTrigger value="ot" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              OT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counter" className="mt-6">
            <StaffCounter />
          </TabsContent>

          <TabsContent value="lab" className="mt-6">
            <StaffLab />
          </TabsContent>

          <TabsContent value="ot" className="mt-6">
            <StaffOT />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
