import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorPayments } from "@/components/DoctorPayments";
import { DoctorFeeManager } from "@/components/finance/DoctorFeeManager";

export default function FinanceDoctorPayments() {
  return (
    <Tabs defaultValue="fees" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fees">Fee Settings</TabsTrigger>
        <TabsTrigger value="payments">Daily Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="fees"><DoctorFeeManager /></TabsContent>
      <TabsContent value="payments"><DoctorPayments /></TabsContent>
    </Tabs>
  );
}
