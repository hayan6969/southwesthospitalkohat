
import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsManager } from "@/components/inventory/InventoryItemsManager";
import { LabInventoryManager } from "@/components/inventory/LabInventoryManager";
import { InventoryRequestsManager } from "@/components/inventory/InventoryRequestsManager";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";

const DashboardInventoryManager = () => {
  return (
    <AppLayout sidebarRole="inventory_manager">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage general & lab inventory, approve requests</p>
        </div>

        <LowStockAlerts />

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">Supply Requests</TabsTrigger>
            <TabsTrigger value="general">General Inventory</TabsTrigger>
            <TabsTrigger value="lab">Lab Inventory</TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <InventoryRequestsManager />
          </TabsContent>
          <TabsContent value="general">
            <InventoryItemsManager />
          </TabsContent>
          <TabsContent value="lab">
            <LabInventoryManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default DashboardInventoryManager;
